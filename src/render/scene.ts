// The renderer: a lit pop-up book of a mountain (GDD §23). Reads the simulation and its semantic events;
// owns the camera (GDD §15), seasons per room, the turn's camera pull and pop-up timing, lights and shake.
import * as THREE from "three";
import type { Sim, SimEvent } from "../sim/sim.ts";
import { ActorLayer } from "./actors.ts";
import { Effects } from "./fx.ts";
import { FolioPuppet } from "./folio.ts";
import { animateLandmark, buildLandmark, type LandmarkVisual } from "./landmarks.ts";
import { C, clamp, K, seasonColor, smooth, sval } from "./paper.ts";
import { PALETTE, Terrain } from "./terrain.ts";

export interface ViewSettings {
  shake: number; // 0..1
  reduceFlash: boolean;
  reduceMotion: boolean;
  quality: "low" | "medium" | "high";
}

/** three r155+ dropped legacy light units; the look test was authored on r128. */
const LIGHT = Math.PI;

const STOCK_COLORS: Record<string, string[]> = {
  tissue: ["#f3ece0", "#e8a03c", "#d9682b"],
  card: ["#2a2730", "#4a4652", "#c9a24a"],
  wax: ["#7a5a3a", "#94704a"],
  felt: ["#d9dee4", "#8a96a4"],
  plain: ["#e9edf1", "#7d8a99", "#ffffff"],
  foil: ["#c0c6cc"],
};

export class PaperRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 260);
  readonly terrain: Terrain;
  readonly folio = new FolioPuppet();
  readonly actors = new ActorLayer();
  readonly fx = new Effects();
  private readonly sim: Sim;
  private readonly hemi = new THREE.HemisphereLight(0xffe0b0, 0x6b3b22, 0.55);
  private readonly sun = new THREE.DirectionalLight(0xffb36b, 1.1);
  private readonly sky: THREE.Mesh;
  private readonly skyGeo: THREE.PlaneGeometry;
  private readonly skyCols: Float32Array;
  private readonly sunDisc: THREE.Mesh;
  private readonly pool: THREE.PointLight[] = [];
  private landmarks: LandmarkVisual[] = [];
  private sRooms: number[] = [];
  private sTarget: number[] = [];
  private turn: null | { start: number; length: number; first: boolean; pass: number[]; rot: Array<{ cell: number; at: number }> } = null;
  private time = 0;
  private camX = 0;
  private camY = 0;
  private camD = 22;
  private lead = 0;
  private trauma = 0;
  private aspect = 1;
  private bloomPlucks = 0;
  settings: ViewSettings = { shake: 1, reduceFlash: false, reduceMotion: false, quality: "medium" };
  /** Hooks for HUD/audio side effects that depend on presentation timing. */
  onPluck: ((tier: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, sim: Sim) {
    this.canvas = canvas;
    this.sim = sim;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.fog = new THREE.Fog(0xf6d7a7, 34, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 18, bottom: -18, near: 1, far: 100 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.skyGeo = new THREE.PlaneGeometry(300, 140, 1, 8);
    this.skyCols = new Float32Array(this.skyGeo.attributes.position!.count * 3);
    this.skyGeo.setAttribute("color", new THREE.BufferAttribute(this.skyCols, 3));
    this.sky = new THREE.Mesh(this.skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    this.scene.add(this.sky);
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false }));
    this.scene.add(this.sunDisc);
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 10, 1);
      this.pool.push(l);
      this.scene.add(l);
    }
    this.terrain = new Terrain(sim.world);
    this.scene.add(this.terrain.group, this.folio.root, this.actors.group, this.fx.group);
    this.resetSeasons(true);
    const b = sim.body;
    this.camX = b.x;
    this.camY = b.y;
    this.resize();
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  applyQuality(q: ViewSettings["quality"]): void {
    const changed = this.settings.quality !== q || !this.qualityApplied;
    this.settings.quality = q;
    this.qualityApplied = true;
    const size = q === "high" ? 4096 : 2048;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    // Low drops shadows and the paper bump (the two biggest fill costs) for weak GPUs.
    const shadows = q !== "low";
    if (changed) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!m || !("bumpMap" in m)) return;
        if (m.userData.bump === undefined) m.userData.bump = m.bumpMap;
        m.bumpMap = shadows ? m.userData.bump : null;
        m.needsUpdate = true;
      });
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === "low" ? 1 : q === "high" ? 2 : 1.5));
    this.resize();
  }
  private qualityApplied = false;

  private baseSeason(i: number): number {
    const band = this.sim.world.rooms[i]!.def.band;
    return band === "winter" || band === "floor" ? 1 : 0;
  }

  private resetSeasons(instant: boolean): void {
    const n = this.sim.world.rooms.length;
    this.sTarget = Array.from({ length: n }, (_, i) => (this.sim.world.spring ? 2 : this.baseSeason(i)));
    if (instant || this.sRooms.length !== n) this.sRooms = [...this.sTarget];
  }

  /** Season value at a world x, blended across room seams. */
  private seasonAtX(x: number): number {
    const rooms = this.sim.world.rooms;
    const r = this.sim.world.roomAt(x);
    const s = this.sRooms[r.index] ?? 0;
    const edge = 6;
    if (x > r.x1 - edge && r.index + 1 < rooms.length) return s + ((this.sRooms[r.index + 1] ?? s) - s) * smooth(r.x1 - edge, r.x1 + edge, x) * 0.5;
    if (x < r.x0 + edge && r.index > 0) return s + ((this.sRooms[r.index - 1] ?? s) - s) * (1 - smooth(r.x0 - edge, r.x0 + edge, x)) * 0.5;
    return s;
  }

  // ------------------------------------------------------------------ events

  handle(events: SimEvent[]): void {
    const sim = this.sim;
    const fx = this.fx;
    const b = sim.body;
    for (const e of events) {
      const x = (e.x as number) ?? b.x, y = (e.y as number) ?? b.y;
      switch (e.id) {
        case "move.land":
          if ((e.speed as number) > 7) fx.burst(b.x, b.y + 0.05, 6, this.dustColors(), 2.5, { up: 1.5, life: 0.5, size: 0.8 });
          break;
        case "move.jump":
          fx.burst(b.x, b.y + 0.05, 3, this.dustColors(), 1.5, { up: 0.5, life: 0.35, size: 0.6 });
          break;
        case "move.crumple":
        case "move.flatten":
          fx.burst(b.x, b.y + 0.1, 4, ["#f3ece0"], 2, { up: 1, life: 0.3, size: 0.5 });
          break;
        case "verb.use":
          if (e.verb === "blade") fx.slash(b.x, b.y, b.facing, !!sim.prev.up, (e.tier as number) >= 2 ? "#ffd36b" : "#fff4dc");
          break;
        case "lantern.flare":
          fx.ring(x, y, 0.4, e.r as number, "#ffd36b", 0.4);
          fx.burst(x, y, 14, ["#ffd36b", "#f0a23a", "#d9582a"], 4, { up: 1, life: 0.5, grav: 2 });
          break;
        case "hook.throw":
          fx.burst(x, y, 4, ["#7b8a96"], 2, { life: 0.3, size: 0.5 });
          break;
        case "enemy.hit": {
          const heavy = !!e.heavy;
          fx.burst(x, y, heavy ? 16 : 7, STOCK_COLORS[e.stock as string] ?? ["#ffffff"], heavy ? 6 : 4, { up: 2 });
          if (heavy) this.shake(0.35);
          break;
        }
        case "enemy.die":
          fx.burst(x, y, e.kind === "wolf" ? 40 : 18, [...(STOCK_COLORS.tissue ?? []), "#ffffff"], 5, { up: 3 });
          break;
        case "stomp":
          fx.burst(x, y, 6, ["#f3ece0", "#ffffff"], 3, { up: 0.5, life: 0.35 });
          break;
        case "crease.take":
          fx.burst(b.x, b.cy, 10, ["#f3ece0", "#e9dfcf"], 4, { up: 2 });
          this.shake(0.4);
          break;
        case "parry":
          fx.ring(x, y, 0.2, 1.6, "#b8322c", 0.3);
          fx.burst(x, y, 12, ["#5d7f3e", "#b8322c", "#3f5a2c"], 6, { up: 1 });
          this.shake(0.4);
          break;
        case "block":
          fx.ring(x, y, 0.2, 0.8, "#efe6d2", 0.2);
          break;
        case "dodge.perfect":
          fx.ring(x, y, 0.3, 1.2, "#ffffff", 0.25);
          break;
        case "moth.dust":
          fx.burst(x, y, 18, ["#e6eef4", "#cfdde8"], 2.2, { up: 0, grav: 1, life: 0.9, size: 0.7 });
          break;
        case "thorns.burn":
          fx.burst(x, y, 5, ["#d9582a", "#f0a23a", "#4a2a26"], 2, { up: 2, grav: 3, life: 0.6, size: 0.6 });
          break;
        case "thorns.hit":
          this.shake(0.25);
          break;
        case "item.bury": {
          const p = this.terrain.plots.get(e.plot as string);
          if (p) p.fill = 1;
          fx.burst(x, y + 0.1, 12, ["#4a2b1d", "#6e351f", "#3a281c"], 3, { up: 2, life: 0.5 });
          break;
        }
        case "item.pickup":
          fx.ring(x, y + 0.75, 0.2, 1.0, "#fff4dc", 0.3);
          break;
        case "landmark.harvest":
          fx.burst(x, y + 0.6, 20, ["#fff4dc", "#ffd36b", "#f3b6c8"], 4, { up: 3, grav: 4, life: 0.8 });
          fx.ring(x, y + 0.6, 0.2, 1.4, "#fff4dc", 0.4);
          break;
        case "guardian.start":
          this.shake(0.3);
          break;
        case "guardian.land":
          fx.burst(x, y, 14, ["#f4f7fa", "#dfe8ee"], 4, { up: 2 });
          this.shake(0.45);
          break;
        case "guardian.howl":
          fx.ring(x + 1.2, y + 1.5, 0.5, 6, "#e6eef4", 0.8);
          this.shake(0.25);
          break;
        case "guardian.phase":
          fx.burst(x, y + 0.7, 40, ["#e9edf1", "#7d8a99", "#ffffff"], 7, { up: 3 });
          this.shake(0.9);
          break;
        case "guardian.fall":
          this.shake(1);
          break;
        case "season.turn":
          this.beginTurn(e);
          break;
        case "landmark.rise":
          this.queueLandmark(e);
          break;
        case "plot.rot":
          this.queueRot(e);
          break;
        case "torn":
          fx.burst(b.x, b.cy, 60, ["#f3ece0", "#e9dfcf", "#c8572a", "#ffffff"], 5, { up: 2, grav: 3, life: 2.2, size: 1.4 });
          break;
        case "year.start":
          this.newYear();
          break;
      }
    }
  }

  private dustColors(): string[] {
    const s = this.seasonAtX(this.sim.body.x);
    return s > 1.5 ? ["#6aa84f", "#f3b6c8"] : s > 0.5 ? ["#f4f7fa", "#e2e8ee"] : ["#d9682b", "#b57a3c"];
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private newYear(): void {
    for (const l of this.landmarks) this.terrain.group.remove(l.group);
    this.landmarks = [];
    for (const p of this.terrain.plots.values()) {
      p.fill = 0;
      p.mound.scale.y = 0.0001;
    }
    for (const cell of [...this.sim.world.stumps, ...this.rotCells]) this.terrain.setStump(cell, false);
    this.rotCells = [];
    this.turn = null;
    this.resetSeasons(true);
    const b = this.sim.body;
    this.camX = b.x;
    this.camY = b.y;
  }
  private rotCells: number[] = [];

  private beginTurn(e: SimEvent): void {
    const w = this.sim.world;
    const first = !!e.first;
    const length = e.length as number;
    const floorX = w.rooms[w.rooms.length - 1]!.x0 + 10, topX = w.rooms[0]!.x1;
    const pass = w.rooms.map((r) => {
      const p = clamp((floorX - (r.x0 + r.x1) / 2) / (floorX - topX), 0, 1);
      return first ? 0.8 + 3.8 * p : 0.15 + 1.4 * p;
    });
    this.turn = { start: this.time, length, first, pass, rot: [] };
  }

  private passTime(x: number): number {
    if (!this.turn) return this.time;
    const w = this.sim.world;
    const r = w.roomAt(x);
    const base = this.turn.pass[r.index] ?? 0;
    const inRoom = clamp((r.x1 - x) / (r.x1 - r.x0), 0, 1) * (this.turn.first ? 0.45 : 0.2);
    return this.turn.start + base + inRoom;
  }

  private queueLandmark(e: SimEvent): void {
    const info = this.sim.landmarks.find((l) => l.plot.id === e.plot);
    if (!info) return;
    const start = this.passTime(info.x) + 0.2;
    const v = buildLandmark(info, start);
    this.terrain.group.add(v.group);
    this.landmarks.push(v);
  }

  private queueRot(e: SimEvent): void {
    const w = this.sim.world;
    const cx = Math.floor(e.x as number), cy = Math.floor(e.y as number);
    const cell = cy * w.W + cx;
    this.rotCells.push(cell);
    this.turn?.rot.push({ cell, at: this.passTime(e.x as number) + 0.6 });
    if (!this.turn) this.terrain.setStump(cell, true);
  }

  // ------------------------------------------------------------------ frame

  render(dtIn: number, fx: number, fy: number): void {
    const dt = Math.max(0, Math.min(0.1, dtIn));
    this.time += dt;
    const sim = this.sim;
    const w = sim.world;
    const b = sim.body;
    const t = this.time;

    // Seasons per room; during the turn each room thaws as the camera passes it.
    if (this.turn) {
      const tt = t - this.turn.start;
      w.rooms.forEach((r, i) => {
        if (tt >= (this.turn!.pass[i] ?? 0)) this.sTarget[i] = 2;
      });
      for (const rot of this.turn.rot) if (t >= rot.at) this.terrain.setStump(rot.cell, true);
      if (tt > this.turn.length + 0.5) {
        for (const rot of this.turn.rot) this.terrain.setStump(rot.cell, true);
        this.turn = null;
      }
    } else if (w.spring) this.sTarget = this.sTarget.map(() => 2);
    for (let i = 0; i < this.sRooms.length; i++) {
      const cur = this.sRooms[i]!, tgt = this.sTarget[i]!;
      this.sRooms[i] = cur + Math.sign(tgt - cur) * Math.min(Math.abs(tgt - cur), dt * (this.turn ? 1.3 : 3));
    }

    // Camera.
    const turnCam = this.turn && this.turn.first ? this.turnCamera(t - this.turn.start) : null;
    let tx: number, ty: number, td: number;
    const floor = w.rooms[w.rooms.length - 1]!;
    if (turnCam) [tx, ty, td] = turnCam;
    else if (sim.phase === "guardian" || (sim.phase === "turn" && b.x > floor.x0)) {
      tx = (floor.x0 + floor.x1) / 2;
      ty = w.guardian.y + 3.4;
      td = this.aspect < 1.3 ? 34 : 28;
    } else {
      this.lead += ((b.facing * 2.6) - this.lead) * Math.min(1, dt * 2.2);
      tx = fx + this.lead;
      const climbing = sim.phase === "climb" || sim.phase === "hearth";
      ty = fy + (climbing ? 2.6 : -1.2) + 1;
      td = this.aspect < 1 ? 19 / Math.max(this.aspect, 0.5) * 0.75 : this.aspect < 1.5 ? 18 : 22;
    }
    // Never show past the ends of the face.
    if (!turnCam) {
      const half = this.camD * Math.tan((this.camera.fov * Math.PI) / 360) * this.aspect * 0.92;
      tx = clamp(tx, Math.min(half, w.W / 2), Math.max(w.W - half, w.W / 2));
    }
    // A warp, a new year or a respawn cuts instead of panning across the mountain.
    if (!turnCam && (Math.abs(tx - this.camX) > 30 || Math.abs(ty - this.camY) > 20)) {
      this.camX = tx;
      this.camY = ty;
    }
    const kx = 1 - Math.exp(-dt / (turnCam ? 0.12 : 0.2)), ky = 1 - Math.exp(-dt / (turnCam ? 0.12 : Math.abs(ty - this.camY) > 6 ? 0.12 : 0.3));
    this.camX += (tx - this.camX) * kx;
    this.camY += (ty - this.camY) * ky;
    this.camD += (td - this.camD) * (1 - Math.exp(-dt / 0.4));
    const shakeAmp = this.trauma * this.trauma * 0.12 * this.settings.shake * (this.settings.reduceMotion ? 0.3 : 1);
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const sx = (Math.random() - 0.5) * shakeAmp, sy = (Math.random() - 0.5) * shakeAmp;
    this.camera.position.set(this.camX + sx, this.camY + 1.1 + sy, this.camD);
    this.camera.lookAt(this.camX + sx, this.camY - 0.2 + sy, 0);

    // Sky, sun, fog, light by the season at the camera.
    const S = this.seasonAtX(this.camX);
    const tmp = new THREE.Color(), tmp2 = new THREE.Color();
    seasonColor(PALETTE.skyTop, S, tmp);
    seasonColor(PALETTE.skyHor, S, tmp2);
    const pos = this.skyGeo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const k = clamp((pos.getY(i) + 70) / 140, 0, 1);
      const c = tmp2.clone().lerp(tmp, smooth(0.38, 0.85, k));
      this.skyCols[i * 3] = c.r;
      this.skyCols[i * 3 + 1] = c.g;
      this.skyCols[i * 3 + 2] = c.b;
    }
    this.skyGeo.attributes.color!.needsUpdate = true;
    this.sky.position.set(this.camX, this.camY + 8, -30);
    (this.scene.fog as THREE.Fog).color.copy(tmp2);
    this.scene.background = tmp2.clone();
    seasonColor(PALETTE.sunDisc, S, (this.sunDisc.material as THREE.MeshBasicMaterial).color);
    seasonColor(PALETTE.sun, S, this.sun.color);
    this.sun.intensity = LIGHT * sval(1.15, 0.75, 1.2, S) * (sim.phase === "guardian" ? 1.15 : 1);
    this.hemi.color.copy(tmp);
    seasonColor(PALETTE.hemiGround, S, this.hemi.groundColor);
    this.hemi.intensity = LIGHT * sval(0.6, 0.78, 0.66, S);
    this.sunDisc.position.set(this.camX * 0.9 + sval(-9, -4, 7, S), this.camY + sval(7.5, 9.5, 12, S), -28);
    this.sun.position.set(this.camX + sval(-15, -6, -9, S), this.camY + sval(10, 17, 19, S), 16);
    this.sun.target.position.set(this.camX, this.camY, -4);

    // World dressing.
    this.terrain.update(this.sRooms, S, t, w.burned, w.gateClosed, w.spring ? 1 : 0);
    for (const p of this.terrain.plots.values()) {
      const lm = this.landmarks.find((l) => l.id === p.id);
      const risen = lm ? clamp((t - lm.start) / 1.0, 0, 1) : 0;
      const targetY = p.fill * (0.55 - 0.3 * risen);
      p.mound.scale.y = Math.max(0.0001, p.mound.scale.y + (targetY - p.mound.scale.y) * Math.min(1, dt * 5));
    }
    for (const lm of this.landmarks) {
      const harvested = !!sim.plots.get(lm.id).landmark?.harvested;
      const plucks = animateLandmark(lm, t, harvested, this.settings.reduceMotion);
      if (plucks > 0 && this.onPluck) for (let i = 0; i < plucks; i++) this.onPluck(lm.tier);
      this.bloomPlucks += plucks;
    }
    // Point lights: the four nearest warm sources.
    const sources = [...this.terrain.lights, ...this.landmarks.filter((l) => l.light && t > l.start + l.span * 0.6).map((l) => ({ ...l.light!, kind: "landmark" }))];
    sources.sort((a, c) => Math.abs(a.x - this.camX) + Math.abs(a.y - this.camY) - (Math.abs(c.x - this.camX) + Math.abs(c.y - this.camY)));
    this.pool.forEach((l, i) => {
      const s = sources[i];
      if (!s || Math.abs(s.x - this.camX) > 26) {
        l.intensity = 0;
        return;
      }
      l.position.set(s.x, s.y, 1.2);
      l.color.setHex(s.color);
      l.intensity = LIGHT * s.power * 1.6 * (1 + Math.sin(t * 7 + i) * 0.06);
      l.distance = 9;
    });

    // Folio, creatures, pickups, rope.
    this.folio.update(sim, fx, fy, dt, t);
    this.actors.syncEnemies(sim.enemies, t);
    this.actors.syncPickups(sim.pickups, t);
    if (b.rope) this.fx.setRope(true, b.rope.x, b.rope.y, fx, fy + b.h * 0.6);
    else this.fx.setRope(false);
    const snow = smooth(0.35, 0.95, S) * (1 - smooth(1.05, 1.5, S));
    this.fx.reduceMotion = this.settings.reduceMotion;
    this.fx.update(dt, t, this.camX, this.camY, { snow, leaf: 1 - smooth(0.3, 0.75, S), bloom: smooth(1.3, 2, S), s: S });
    this.renderer.render(this.scene, this.camera);
  }

  /** The first turn: hold on Folio, pull up the whole face as it thaws, then come back. */
  private turnCamera(tt: number): [number, number, number] | null {
    const w = this.sim.world;
    const b = this.sim.body;
    const floor = w.rooms[w.rooms.length - 1]!;
    const start: [number, number] = [(floor.x0 + floor.x1) / 2, w.guardian.y + 3.4];
    const path = w.rooms.slice(0, -1).reverse().map((r): [number, number] => {
      const cx = (r.x0 + r.x1) / 2;
      return [cx, (this.terrain.surfaceBelow(cx, r.top + 2) ?? r.top - 8) + 3];
    });
    const pts = [start, ...path];
    if (tt < 0.8) return [start[0], start[1], 28];
    if (tt < 4.6) {
      const k = smooth(0, 1, (tt - 0.8) / 3.8) * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(k));
      const f = k - i;
      const a = pts[i]!, c = pts[i + 1]!;
      return [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, 34];
    }
    if (tt < 6) return [b.x, b.y + 2, 24];
    return null;
  }
}

export const SEASON_KEYS = K;
export const _C = C;
