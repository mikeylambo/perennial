// The face in paper: one cut sheet per room for the gameplay plane (deckled edges from the tile grid),
// a cap strip (leaf litter, snow, grass), a dark foreground frame, far ridges, trees and season dressing.
// Built once from the World; seasons recolor and regrow it (art bible §1.3) without rebuilding geometry.
import * as THREE from "three";
import type { World } from "../sim/world.ts";
import { blob, C, circle, flame, flowerShape, K, mat, mesh, paperTexture, poly, rng, seasonColor, slab, smooth, valueNoise, type Keys } from "./paper.ts";

const PPT = 16; // mask pixels per tile

export const PALETTE = {
  ground: K("#6e351f", "#5b6979", "#446f35"),
  cap: K("#b57a3c", "#f4f7fa", "#6aa84f"),
  fg: K("#3d1f15", "#2f3a47", "#2b4a26"),
  far: K("#c98a5c", "#a9b7c6", "#93b9b3"),
  mid: K("#b8693f", "#8fa1b4", "#79a873"),
  near: K("#9b4a2b", "#76889d", "#5b9150"),
  trunk: K("#5a3221", "#3f3b3c", "#4e3a28"),
  tuft: K("#a8743a", "#a8743a", "#6aa84f"),
  soil: K("#4a2b1d", "#e4eaef", "#3a281c"),
  skyTop: K("#e39b62", "#9fb2c6", "#86c0d3"),
  skyHor: K("#f7d9a8", "#e2e8ee", "#eef3dc"),
  sunDisc: K("#ffe2b0", "#f4f6f8", "#fff6dc"),
  sun: K("#ffb36b", "#dfe8ff", "#fff1d2"),
  hemiGround: K("#6b3b22", "#5d6b7a", "#3f5a35"),
};

interface RoomVisual {
  index: number;
  x0: number;
  x1: number;
  ground: THREE.MeshStandardMaterial;
  cap: THREE.MeshStandardMaterial;
  fg: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  tuft: THREE.MeshStandardMaterial;
  tufts: THREE.InstancedMesh;
  tuftBase: THREE.Matrix4[];
  flowers: Array<{ g: THREE.Group; size: number; wave: number }>;
  trees: Array<{ can: THREE.Group; back: THREE.Mesh; front: THREE.Mesh; stagger: number }>;
  canopyBack: THREE.MeshStandardMaterial;
  canopyFront: THREE.MeshStandardMaterial;
  s: number;
}

export interface PlotVisual {
  id: string;
  x: number;
  y: number;
  group: THREE.Group;
  mound: THREE.Mesh;
  soil: THREE.MeshStandardMaterial;
  flag: THREE.Mesh;
  fill: number;
}

export class Terrain {
  readonly group = new THREE.Group();
  readonly rooms: RoomVisual[] = [];
  readonly plots = new Map<string, PlotVisual>();
  readonly lights: Array<{ x: number; y: number; color: number; power: number; kind: string }> = [];
  private blossoms: Array<{ g: THREE.Group; x: number; y: number }> = [];
  private springThorns: Array<{ g: THREE.Group; cells: number[] }> = [];
  private drifts: Array<{ m: THREE.Mesh; mat: THREE.MeshStandardMaterial; x: number }> = [];
  private ice: THREE.Mesh[] = [];
  private gate: THREE.Group | null = null;
  private flames: THREE.Mesh[] = [];
  private stumps = new Map<number, THREE.Mesh>();
  private ridges: Array<{ m: THREE.MeshStandardMaterial; keys: Keys; cap: THREE.Mesh }> = [];
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
    this.buildBackground();
    for (const r of world.rooms) this.buildRoom(r.index);
    this.buildProps();
  }

  // ------------------------------------------------------------- geometry sampling

  /** Whether a world point is inside rock (descent geometry, no dynamic cells). */
  private solidAt(x: number, y: number): boolean {
    const cx = Math.floor(x), cy = Math.floor(y);
    const c = this.world.char(cx, cy);
    if (c === "#") return true;
    if (c === "n") return y - cy >= 0.5;
    if (c === "/") return y - cy <= x - cx;
    if (c === "\\") return y - cy <= 1 - (x - cx);
    return false;
  }

  /** Top surface height of the ground at a column center, scanning down from y. */
  surfaceBelow(x: number, y: number): number | null {
    for (let cy = Math.floor(y); cy > 0; cy--) {
      const c = this.world.char(Math.floor(x), cy);
      if (c === "#" || c === "n") return cy + 1;
      if (c === "/") return cy + (x - Math.floor(x));
      if (c === "\\") return cy + 1 - (x - Math.floor(x));
    }
    return null;
  }

  private sheet(cols0: number, cols1: number, y0: number, y1: number, test: (x: number, y: number) => boolean): THREE.CanvasTexture {
    const pad = 1;
    const w = (cols1 - cols0 + pad * 2) * PPT, h = (y1 - y0) * PPT;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let py = 0; py < h; py++) {
      const y = y1 - (py + 0.5) / PPT;
      for (let px = 0; px < w; px++) {
        const x = cols0 - pad + (px + 0.5) / PPT;
        const v = test(x, y) ? 255 : 0;
        const i = (py * w + px) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    // Show only the room's own columns; the padding keeps edges continuous across rooms.
    t.repeat.set((cols1 - cols0) / (cols1 - cols0 + pad * 2), 1);
    t.offset.set(pad / (cols1 - cols0 + pad * 2), 0);
    return t;
  }

  private plane(x0: number, x1: number, y0: number, y1: number, z: number, m: THREE.Material, shadow: boolean): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    const o = mesh(geo, m, shadow);
    o.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    this.group.add(o);
    return o;
  }

  private sheetMat(color: THREE.Color, alpha: THREE.Texture, w: number, h: number): THREE.MeshStandardMaterial {
    const grain = paperTexture().clone();
    grain.needsUpdate = true;
    grain.repeat.set(w * 0.18, h * 0.18);
    return new THREE.MeshStandardMaterial({ color, map: grain, bumpMap: grain, bumpScale: 0.02, roughness: 0.95, metalness: 0, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
  }

  // ------------------------------------------------------------- rooms

  private buildRoom(index: number): void {
    const room = this.world.rooms[index]!;
    const r = rng(1000 + index);
    const nLow = valueNoise(11 + index), nHigh = valueNoise(97 + index);
    const disp = (x: number, y: number): [number, number] => [
      (nLow(x * 0.8, y * 0.8) - 0.5) * 0.22 + (nHigh(x * 5, y * 5) - 0.5) * 0.06,
      (nLow(x * 0.8 + 31, y * 0.8 + 17) - 0.5) * 0.16 + (nHigh(x * 5 + 9, y * 5 + 3) - 0.5) * 0.05,
    ];
    const solid = (x: number, y: number) => {
      const [dx, dy] = disp(x, y);
      return this.solidAt(x + dx, y + dy);
    };
    const y0 = Math.max(0, room.bottom - 10), y1 = room.top + 1;
    const W = room.x1 - room.x0, H = y1 - y0;
    const groundTex = this.sheet(room.x0, room.x1, y0, y1, solid);
    const capTex = this.sheet(room.x0, room.x1, y0, y1, (x, y) => solid(x, y) && !solid(x, y + 0.26));
    const fgTex = this.sheet(room.x0, room.x1, y0, y1, (x, y) => solid(x, y + 2.6) && solid(x - 2, y + 1.6) && solid(x + 2, y + 1.6) && solid(x, y));
    const ground = this.sheetMat(PALETTE.ground[0].clone(), groundTex, W, H);
    const cap = this.sheetMat(PALETTE.cap[0].clone(), capTex, W, H);
    const fg = this.sheetMat(PALETTE.fg[0].clone(), fgTex, W, H);
    this.plane(room.x0, room.x1, y0, y1, 0, ground, true);
    this.plane(room.x0, room.x1, y0, y1, 0.05, cap, false);
    this.plane(room.x0, room.x1, y0, y1, 2.4, fg, true);

    // Dressing along the walkable surface: trees behind, tufts and flowers in front.
    const trunk = mat(PALETTE.trunk[0].clone());
    const canopyBack = mat(C("#c9552a")), canopyFront = mat(C("#e8a03c"));
    const trees: RoomVisual["trees"] = [];
    const surfaces: Array<[number, number]> = [];
    for (let x = room.x0 + 0.5; x < room.x1; x += 0.5) {
      const s = this.surfaceBelow(x, room.top + 2);
      if (s !== null && this.world.char(Math.floor(x), Math.floor(s) + 1) === ".") surfaces.push([x, s]);
    }
    let next = room.x0 + 2 + r() * 4;
    for (const [x, s] of surfaces) {
      if (x < next || room.def.band === "floor") continue;
      next = x + 5 + r() * 6;
      const h = 2.8 + r() * 1.6;
      const g = new THREE.Group();
      g.position.set(x, s - 0.4, -1.3 - r() * 0.6);
      const tr = poly([[-0.2, 0], [0.2, 0], [0.09, h * 0.92], [-0.09, h * 0.92]]);
      const b1 = poly([[0.05, h * 0.45], [0.12, h * 0.5], [0.75, h * 0.78], [0.68, h * 0.8]]);
      const b2 = poly([[-0.05, h * 0.55], [-0.12, h * 0.6], [-0.65, h * 0.86], [-0.58, h * 0.88]]);
      g.add(mesh(slab([tr, b1, b2], 0.04), trunk));
      const can = new THREE.Group();
      can.position.set(0, h * 0.82, 0);
      const back = mesh(slab(blob(h * 0.36, 3000 + Math.round(x * 10)), 0.04), canopyBack);
      back.position.z = -0.08;
      const front = mesh(slab(blob(h * 0.24, 4000 + Math.round(x * 10)), 0.04), canopyFront);
      front.position.set(h * 0.08 * (r() - 0.5), -h * 0.05, 0.08);
      can.add(back, front);
      g.add(can);
      this.group.add(g);
      trees.push({ can, back, front, stagger: r() * 0.25 });
    }
    const tuft = mat(PALETTE.tuft[0].clone());
    const tuftGeo = new THREE.ShapeGeometry(poly([[-0.22, 0], [-0.3, 0.42], [-0.1, 0.05], [0, 0.55], [0.08, 0.05], [0.3, 0.38], [0.2, 0]]));
    const picks = surfaces.filter(() => r() < 0.55);
    const tufts = new THREE.InstancedMesh(tuftGeo, tuft, Math.max(1, picks.length));
    tufts.count = picks.length;
    const tuftBase: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    picks.forEach(([x, s], i) => {
      dummy.position.set(x + (r() - 0.5) * 0.3, s - 0.05, 0.12);
      dummy.scale.setScalar(0.7 + r() * 0.7);
      dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tuftBase.push(dummy.matrix.clone());
    });
    tufts.receiveShadow = true;
    this.group.add(tufts);
    const flowers: RoomVisual["flowers"] = [];
    const petalMats = ["#f3b6c8", "#fff4dc", "#f6d35b", "#e98fa9", "#ffffff"].map((h) => mat(h));
    const stemMat = mat("#4f8a3e"), centerMat = mat("#d98b2b");
    const fGeo = [new THREE.ShapeGeometry(flowerShape(0.16)), new THREE.ShapeGeometry(flowerShape(0.22))];
    const stemGeo = new THREE.ShapeGeometry(poly([[-0.025, 0], [0.025, 0], [0.02, 1], [-0.02, 1]]));
    const centerGeo = new THREE.CircleGeometry(0.06, 10);
    for (const [x, s] of surfaces) {
      if (r() > 0.32) continue;
      const g = new THREE.Group();
      g.position.set(x + (r() - 0.5) * 0.4, s - 0.05, 0.16);
      const h = 0.35 + r() * 0.5;
      const st = new THREE.Mesh(stemGeo, stemMat);
      st.scale.y = h;
      const hd = new THREE.Mesh(fGeo[r() < 0.5 ? 0 : 1]!, petalMats[Math.floor(r() * petalMats.length)]!);
      hd.position.set(0, h, 0.01);
      const ce = new THREE.Mesh(centerGeo, centerMat);
      ce.position.set(0, h, 0.02);
      g.add(st, hd, ce);
      g.scale.setScalar(0.0001);
      g.visible = false;
      this.group.add(g);
      flowers.push({ g, size: 0.8 + r() * 0.7, wave: r() * 0.25 });
    }
    this.rooms.push({ index, x0: room.x0, x1: room.x1, ground, cap, fg, trunk, tuft, tufts, tuftBase, flowers, trees, canopyBack, canopyFront, s: 0 });
  }

  // ------------------------------------------------------------- background

  private buildBackground(): void {
    const w = this.world;
    // A smoothed profile of the face, so far ridges follow the mountain down.
    const prof: number[] = [];
    for (let x = 0; x < w.W; x++) prof.push(this.surfaceBelow(x + 0.5, w.H - 1) ?? 0);
    const sm = (x: number) => {
      let s = 0, n = 0;
      for (let k = -14; k <= 14; k++) {
        const v = prof[Math.max(0, Math.min(w.W - 1, Math.round(x) + k))]!;
        s += v;
        n++;
      }
      return s / n;
    };
    const defs = [
      { z: -16, keys: PALETTE.far, f: (x: number) => sm(x) + 12 + 3.2 * Math.sin(x * 0.11 + 1) + 1.6 * Math.sin(x * 0.29), step: 0.9, jit: 0.25 },
      { z: -10, keys: PALETTE.mid, f: (x: number) => sm(x) + 6.5 + 1.9 * Math.sin(x * 0.19 + 2) + 0.7 * Math.sin(x * 0.6), step: 0.7, jit: 0.18 },
      { z: -5.2, keys: PALETTE.near, f: (x: number) => sm(x) + 2.2 + 1.2 * Math.sin(x * 0.27 + 0.5) + 0.4 * Math.sin(x * 0.9), step: 0.5, jit: 0.12 },
    ];
    defs.forEach((L, li) => {
      const r = rng(100 + li);
      const pts: Array<[number, number]> = [];
      for (let x = -60; x <= w.W + 60; x += L.step) pts.push([x, L.f(x) + (r() - 0.5) * L.jit]);
      const m = mat(L.keys[0].clone());
      const o = mesh(slab(poly([[-60, -60], ...pts, [w.W + 60, -60]]), 0.08), m);
      o.position.z = L.z;
      this.group.add(o);
      const th = (x: number) => (0.32 + 0.12 * Math.sin(x * 1.7 + li) + 0.08 * Math.sin(x * 4.1)) * (li < 2 ? 1.8 : 1);
      const top = pts.map(([x, y]): [number, number] => [x, y + 0.03]);
      const bot = pts.slice().reverse().map(([x, y]): [number, number] => [x, y - th(x)]);
      const cap = mesh(slab(poly([...top, ...bot]), 0.02), mat("#f4f7fa"), false);
      cap.position.z = L.z + 0.085;
      cap.visible = false;
      this.group.add(cap);
      this.ridges.push({ m, keys: L.keys, cap });
      // A few trees on the nearest ridge.
      if (li === 2) {
        const trunk = mat("#5a3221"), cb = mat("#c9552a"), cf = mat("#e8a03c");
        for (let x = -40; x < w.W + 40; x += 4 + r() * 5) {
          const h = 2.4 + r() * 1.4;
          const g = new THREE.Group();
          g.position.set(x, L.f(x) - 0.5, L.z - 0.2);
          g.add(mesh(slab(poly([[-0.18, 0], [0.18, 0], [0.08, h * 0.9], [-0.08, h * 0.9]]), 0.04), trunk));
          const c1 = mesh(slab(blob(h * 0.34, 7000 + Math.round(x * 10)), 0.04), cb);
          c1.position.set(0, h * 0.82, 0);
          g.add(c1);
          const c2 = mesh(slab(blob(h * 0.22, 8000 + Math.round(x * 10)), 0.04), cf);
          c2.position.set(0, h * 0.78, 0.08);
          g.add(c2);
          this.group.add(g);
          this.farTrees.push({ g, c1, c2, cb, cf });
        }
      }
    });
  }
  private farTrees: Array<{ g: THREE.Group; c1: THREE.Mesh; c2: THREE.Mesh; cb: THREE.MeshStandardMaterial; cf: THREE.MeshStandardMaterial }> = [];

  // ------------------------------------------------------------- props from the grid

  private runs(ch: string): Array<{ x0: number; x1: number; y: number }> {
    const w = this.world, out: Array<{ x0: number; x1: number; y: number }> = [];
    for (let cy = 0; cy < w.H; cy++) {
      let start = -1;
      for (let cx = 0; cx <= w.W; cx++) {
        const hit = cx < w.W && w.char(cx, cy) === ch;
        if (hit && start < 0) start = cx;
        if (!hit && start >= 0) {
          out.push({ x0: start, x1: cx, y: cy });
          start = -1;
        }
      }
    }
    return out;
  }

  private buildProps(): void {
    const w = this.world;
    const r = rng(4242);
    // Plots: a dark soil oval, a stake, a red flag; winter stakes carry a two-leaf mark (shape, not color).
    for (const p of w.plots) {
      const g = new THREE.Group();
      const x = p.cx + 0.5, y = p.cy;
      g.position.set(x, y, 0);
      const soil = mat(PALETTE.soil[0].clone());
      const mound = mesh(slab(new THREE.Shape().absarc(0, 0, 0.75, 0, Math.PI, false), 0.05), soil);
      mound.position.set(0, -0.08, -0.12);
      mound.scale.y = 0.0001;
      const bed = mesh(slab(poly([[-0.85, -0.12], [0.85, -0.12], [0.7, 0.04], [-0.7, 0.04]]), 0.05), mat("#3a2418"));
      bed.position.z = -0.1;
      const stake = new THREE.Group();
      stake.position.set(-0.75, -0.1, -0.15);
      stake.add(mesh(slab(poly([[-0.05, 0], [0.05, 0], [0.04, 1.3], [-0.04, 1.3]]), 0.04), mat("#cdb88e")));
      const flag = mesh(slab(poly([[0.04, 1.28], [0.6, 1.14], [0.04, 0.98]]), 0.02), mat("#c8572a"));
      stake.add(flag);
      if (p.band === "winter") {
        const leaf = (dir: number) => poly([[0, 0.62], [dir * 0.22, 0.78], [dir * 0.3, 0.92], [dir * 0.12, 0.86]]);
        const m = mesh(slab([leaf(1), leaf(-1)], 0.03), mat("#2c3a2a"));
        m.position.z = 0.03;
        stake.add(m);
      }
      g.add(bed, mound, stake);
      this.group.add(g);
      this.plots.set(p.id, { id: p.id, x, y, group: g, mound, soil, flag, fill: 0 });
    }
    // Snow drifts (winter) that become meltwater (spring).
    for (const run of this.runs("~")) {
      const m = mat("#f4f7fa");
      const pts: Array<[number, number]> = [];
      const n = (run.x1 - run.x0) * 4;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push([run.x0 - 0.2 + t * (run.x1 - run.x0 + 0.4), Math.sin(t * Math.PI) * 0.85 + (r() - 0.5) * 0.06]);
      }
      const o = mesh(slab(poly([...pts, [run.x1 + 0.2, -0.1], [run.x0 - 0.2, -0.1]]), 0.05), m);
      o.position.set(0, run.y, 0.3);
      this.group.add(o);
      this.drifts.push({ m: o, mat: m, x: (run.x0 + run.x1) / 2 });
    }
    // Thorns: always (^) and spring-only (t).
    const thornMat = mat("#4a2a26"), thornTip = mat("#8f3a2c");
    const thorns = (run: { x0: number; x1: number; y: number }, spring: boolean) => {
      const g = new THREE.Group();
      for (let x = run.x0; x < run.x1; x += 0.5) {
        const h = 0.5 + r() * 0.45;
        const spikes: Array<[number, number]> = [[x - 0.05, run.y]];
        for (let k = 0; k < 3; k++) spikes.push([x + 0.1 + k * 0.15, run.y + h * (0.5 + r() * 0.5)], [x + 0.17 + k * 0.15, run.y + 0.15]);
        spikes.push([x + 0.55, run.y]);
        g.add(mesh(slab(poly(spikes), 0.04), k2(r()) ? thornMat : thornTip));
      }
      g.position.z = 0.25;
      this.group.add(g);
      if (spring) {
        g.visible = false;
        const cells: number[] = [];
        for (let x = run.x0; x < run.x1; x++) cells.push(run.y * w.W + x);
        this.springThorns.push({ g, cells });
      }
    };
    const k2 = (v: number) => v < 0.6;
    for (const run of this.runs("^")) thorns(run, false);
    for (const run of this.runs("t")) thorns(run, true);
    // Blossom branches: the spring bare route.
    const branch = mat("#e9dcc8"), petal = mat("#f3b6c8"), petal2 = mat("#fff4dc"), wood = mat("#6b4a33");
    for (const run of this.runs("v")) {
      const g = new THREE.Group();
      const len = run.x1 - run.x0;
      const top = run.y + 1;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= len * 3; i++) pts.push([run.x0 - 0.1 + (i / (len * 3)) * (len + 0.2), top + (r() - 0.5) * 0.04]);
      const under = pts.slice().reverse().map(([x, y]): [number, number] => [x, y - 0.18 - r() * 0.05]);
      g.add(mesh(slab(poly([...pts, ...under]), 0.06), branch));
      const stalk = mesh(slab(poly([[-0.06, 0], [0.06, 0], [0.04, -2.4], [-0.04, -2.4]]), 0.04), wood);
      stalk.position.set(run.x0 + len / 2, top - 0.1, -0.15);
      g.add(stalk);
      for (let x = run.x0; x < run.x1; x += 0.45) {
        const f = mesh(slab(flowerShape(0.13 + r() * 0.06), 0.02), r() < 0.5 ? petal : petal2, false);
        f.position.set(x + r() * 0.3, top + 0.02 + r() * 0.12, 0.05);
        g.add(f);
      }
      g.visible = false;
      this.group.add(g);
      this.blossoms.push({ g, x: run.x0 + len / 2, y: top });
    }
    // Winter-only ice ledges.
    for (const run of this.runs("w")) {
      const o = mesh(slab(poly([[run.x0, run.y], [run.x1, run.y], [run.x1 - 0.05, run.y + 1], [run.x0 + 0.05, run.y + 1]]), 0.3), mat("#cfe3ee", { roughness: 0.5 }));
      o.position.z = -0.15;
      this.group.add(o);
      this.ice.push(o);
    }
    // Grapple points: a peg with a ring.
    const peg = mat("#5a4636"), ring = mat("#7b8a96");
    for (const a of w.anchors) {
      const g = new THREE.Group();
      g.position.set(a.x, a.y, 0.1);
      g.add(mesh(slab(poly([[-0.5, 0.06], [0.5, 0.06], [0.45, 0.16], [-0.45, 0.16]]), 0.05), peg));
      const rr = new THREE.Shape().absarc(0, -0.1, 0.18, 0, Math.PI * 2, false);
      rr.holes.push(new THREE.Path().absarc(0, -0.1, 0.11, 0, Math.PI * 2, true));
      g.add(mesh(slab(rr, 0.04), ring));
      this.group.add(g);
    }
    // Braziers and the Hearth: paper flames and a warm light.
    const stone = mat("#7b6f63"), f1 = mat("#d9582a", { emissive: new THREE.Color("#7a2a0a"), emissiveIntensity: 0.6 }), f2 = mat("#f0a23a", { emissive: new THREE.Color("#8a4a0a"), emissiveIntensity: 0.6 }), f3 = mat("#ffd36b", { emissive: new THREE.Color("#8a6a1a"), emissiveIntensity: 0.6 });
    const fire = (x: number, y: number, big: boolean) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0.2);
      const s = big ? 1.3 : 0.9;
      g.add(mesh(slab(poly([[-0.5 * s, 0], [0.5 * s, 0], [0.38 * s, 0.32 * s], [-0.38 * s, 0.32 * s]]), 0.08), stone));
      const fl = [mesh(slab(flame(-0.12 * s, 0.25 * s, 0.4 * s, 0.9 * s, -0.1), 0.02), f1, false), mesh(slab(flame(0.12 * s, 0.25 * s, 0.38 * s, 0.75 * s, 0.1), 0.02), f2, false), mesh(slab(flame(0, 0.28 * s, 0.26 * s, 0.6 * s, 0), 0.02), f3, false)];
      fl.forEach((m, i) => {
        m.position.z = 0.05 + i * 0.03;
        g.add(m);
        this.flames.push(m);
      });
      this.group.add(g);
      this.lights.push({ x, y: y + 0.8, color: 0xffa040, power: big ? 2.2 : 1.6, kind: big ? "hearth" : "brazier" });
    };
    for (const h of w.heat) fire(h.x, h.y - 0.5, false);
    fire(w.hearth.x, w.hearth.y, true);
    // The guardian gate: an ice and bramble wall.
    if (w.gates.length) {
      const g = new THREE.Group();
      const ice = mat("#d8e6ee", { roughness: 0.6 });
      for (const i of w.gates) {
        const cx = i % w.W, cy = Math.floor(i / w.W);
        const o = mesh(slab(poly([[cx + 0.05, cy], [cx + 0.95, cy], [cx + 0.85 + r() * 0.1, cy + 1.02], [cx + 0.1, cy + 1.02]]), 0.25), ice);
        o.position.z = -0.1;
        g.add(o);
      }
      g.visible = false;
      this.group.add(g);
      this.gate = g;
    }
  }

  setStump(cell: number, on: boolean): void {
    const w = this.world;
    let m = this.stumps.get(cell);
    if (!m && on) {
      const cx = cell % w.W, cy = Math.floor(cell / w.W);
      const g = mesh(slab(poly([[cx + 0.15, cy], [cx + 0.85, cy], [cx + 0.75, cy + 0.95], [cx + 0.6, cy + 1.02], [cx + 0.42, cy + 0.9], [cx + 0.25, cy + 1.0]]), 0.3), mat("#8d877c"));
      g.position.z = -0.12;
      this.group.add(g);
      this.stumps.set(cell, g);
      m = g;
    }
    if (m) m.visible = on;
  }

  // ------------------------------------------------------------- per frame

  /** s per room: 0 autumn, 1 winter, 2 spring. camS drives far planes. */
  update(sRooms: number[], camS: number, time: number, burned: Set<number>, gateClosed: boolean, spring: number): void {
    const tmp = new THREE.Color();
    for (const rv of this.rooms) {
      const s = sRooms[rv.index] ?? 0;
      if (Math.abs(s - rv.s) < 1e-4 && time > 0.1 && s !== 2) {
        // still update spring growth below
      }
      rv.s = s;
      seasonColor(PALETTE.ground, s, rv.ground.color);
      seasonColor(PALETTE.cap, s, rv.cap.color);
      seasonColor(PALETTE.fg, s, rv.fg.color);
      seasonColor(PALETTE.trunk, s, rv.trunk.color);
      seasonColor(PALETTE.tuft, s, rv.tuft.color);
      const snow = smooth(0.35, 0.95, s) * (1 - smooth(1.05, 1.5, s));
      const fall = 1 - smooth(0.3, 0.85, s);
      const springS = s > 1.15;
      rv.canopyBack.color.set(springS ? "#4f8f42" : "#c9552a");
      rv.canopyFront.color.set(springS ? "#8cc063" : "#e8a03c");
      for (const t of rv.trees) {
        const grow = smooth(1.3 + t.stagger, 1.8 + t.stagger, s);
        t.can.scale.setScalar(Math.max(0.0001, Math.max(fall, grow)));
      }
      const dummy = new THREE.Matrix4(), sc = new THREE.Matrix4();
      rv.tuftBase.forEach((m, i) => {
        sc.makeScale(1, Math.max(0.0001, 1 - snow), 1);
        dummy.copy(m).multiply(sc);
        rv.tufts.setMatrixAt(i, dummy);
      });
      rv.tufts.instanceMatrix.needsUpdate = true;
      for (const f of rv.flowers) {
        const b = smooth(1.35 + f.wave, 1.7 + f.wave, s);
        f.g.visible = b > 0.001;
        if (f.g.visible) {
          const e = b < 1 ? 1 + (1.7 + 1) * Math.pow(b - 1, 3) + 1.7 * Math.pow(b - 1, 2) : 1;
          f.g.scale.setScalar(Math.max(0.0001, e * f.size));
        }
      }
    }
    for (const L of this.ridges) {
      seasonColor(L.keys, camS, L.m.color);
      L.cap.visible = camS > 0.5 && camS < 1.4;
    }
    for (const t of this.farTrees) {
      const sp = camS > 1.15;
      t.cb.color.set(sp ? "#4f8f42" : "#c9552a");
      t.cf.color.set(sp ? "#8cc063" : "#e8a03c");
      const fall = 1 - smooth(0.3, 0.85, camS), grow = smooth(1.3, 1.8, camS);
      const k = Math.max(0.0001, Math.max(fall, grow));
      t.c1.scale.setScalar(k);
      t.c2.scale.setScalar(k);
    }
    for (const b of this.blossoms) {
      const room = this.world.roomAt(b.x);
      const s = sRooms[room.index] ?? 0;
      const k = smooth(1.4, 1.9, s);
      b.g.visible = k > 0.001;
      b.g.scale.set(1, 1, 1);
      if (b.g.visible) {
        b.g.position.set(b.x * (1 - k), b.y * (1 - k), 0);
        b.g.scale.set(k, k, 1);
      }
    }
    for (const t of this.springThorns) t.g.visible = spring > 0.5 && !t.cells.every((c) => burned.has(c));
    for (const d of this.drifts) {
      const s = sRooms[this.world.roomAt(d.x).index] ?? 0;
      seasonColor(K("#f4f7fa", "#f4f7fa", "#7fb2c8"), s, d.mat.color);
      d.m.scale.y = 1 - 0.75 * smooth(1.2, 1.8, s);
    }
    for (const i of this.ice) i.visible = spring < 0.5;
    if (this.gate) this.gate.visible = gateClosed;
    this.flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(time * 9 + i * 1.7) * 0.12;
      f.rotation.z = Math.sin(time * 6 + i) * 0.05;
    });
    for (const p of this.plots.values()) {
      const room = this.world.roomAt(p.x);
      seasonColor(PALETTE.soil, sRooms[room.index] ?? 0, p.soil.color);
      p.flag.rotation.z = Math.sin(time * 2 + p.x) * 0.06;
    }
    void tmp;
    void circle;
  }
}
