// Paper effects (GDD §25): scraps, fold flashes, leaves, snow, petals, dust puffs, slash arcs, flare rings.
// Gameplay information beats spectacle; everything here is presentation only and reads sim events.
import * as THREE from "three";
import { C, clamp, rng } from "./paper.ts";

interface Bit { x: number; y: number; z: number; vx: number; vy: number; rot: number; vr: number; life: number; max: number; size: number; color: THREE.Color; grav: number }

const MAX_BITS = 400;

export class Effects {
  readonly group = new THREE.Group();
  private readonly weather: THREE.InstancedMesh;
  private readonly wd: Array<{ x: number; y: number; z: number; v: number; ph: number; rot: number; rv: number; k: number; c: number }>;
  private mode = "";
  private readonly bits: THREE.InstancedMesh;
  private readonly bitData: Bit[] = [];
  private readonly rings: Array<{ m: THREE.Mesh; life: number; max: number; r0: number; r1: number }> = [];
  private readonly arcs: Array<{ m: THREE.Mesh; life: number }> = [];
  private readonly rope: THREE.Line;
  private readonly dummy = new THREE.Object3D();
  private readonly r = rng(77);
  private readonly ringGeo = new THREE.RingGeometry(0.85, 1, 40);
  private readonly arcGeo: THREE.ShapeGeometry;
  reduceMotion = false;

  constructor() {
    const pGeo = new THREE.CircleGeometry(0.12, 6);
    this.weather = new THREE.InstancedMesh(pGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 240);
    this.weather.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.weather.frustumCulled = false;
    this.wd = Array.from({ length: 240 }, (_, i) => ({ x: (this.r() - 0.5) * 50, y: this.r() * 26 - 6, z: -6 + this.r() * 12, v: 0.6 + this.r() * 0.9, ph: this.r() * 6.28, rot: this.r() * 6.28, rv: (this.r() - 0.5) * 3, k: i / 240, c: this.r() }));
    for (let i = 0; i < 240; i++) this.weather.setColorAt(i, C("#ffffff"));
    this.group.add(this.weather);
    const bGeo = new THREE.PlaneGeometry(0.16, 0.11);
    this.bits = new THREE.InstancedMesh(bGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), MAX_BITS);
    this.bits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bits.frustumCulled = false;
    for (let i = 0; i < MAX_BITS; i++) this.bits.setColorAt(i, C("#ffffff"));
    this.bits.count = 0;
    this.group.add(this.bits);
    const s = new THREE.Shape();
    s.absarc(0, 0, 1.25, -1.1, 1.1, false);
    s.absarc(0.25, 0, 0.95, 1.0, -1.0, true);
    this.arcGeo = new THREE.ShapeGeometry(s, 16);
    const rg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.rope = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: "#5a4636" }));
    this.rope.frustumCulled = false;
    this.rope.visible = false;
    this.group.add(this.rope);
  }

  burst(x: number, y: number, n: number, colors: string[], speed = 4, opts: { up?: number; grav?: number; size?: number; life?: number } = {}): void {
    for (let i = 0; i < n; i++) {
      if (this.bitData.length >= MAX_BITS) this.bitData.shift();
      const a = this.r() * Math.PI * 2, sp = speed * (0.4 + this.r() * 0.8);
      const life = (opts.life ?? 0.7) * (0.6 + this.r() * 0.7);
      this.bitData.push({ x, y, z: 0.5 + this.r() * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + (opts.up ?? 2), rot: this.r() * 6, vr: (this.r() - 0.5) * 18, life, max: life, size: (opts.size ?? 1) * (0.6 + this.r() * 0.8), color: C(colors[Math.floor(this.r() * colors.length)]!), grav: opts.grav ?? 12 });
    }
  }

  ring(x: number, y: number, r0: number, r1: number, color: string, life = 0.35, z = 0.7): void {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(x, y, z);
    this.group.add(m);
    this.rings.push({ m, life, max: life, r0, r1 });
  }

  slash(x: number, y: number, facing: number, up: boolean, color = "#fff4dc"): void {
    const m = new THREE.Mesh(this.arcGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(x + (up ? 0 : facing * 0.75), y + (up ? 1.4 : 0.55), 0.7);
    m.rotation.z = up ? Math.PI / 2 : facing > 0 ? 0 : Math.PI;
    this.group.add(m);
    this.arcs.push({ m, life: 0.12 });
  }

  setRope(on: boolean, ax = 0, ay = 0, bx = 0, by = 0): void {
    this.rope.visible = on;
    if (!on) return;
    const p = this.rope.geometry.attributes.position as THREE.BufferAttribute;
    p.setXYZ(0, ax, ay, 0.4);
    p.setXYZ(1, bx, by, 0.4);
    p.needsUpdate = true;
  }

  update(dt: number, time: number, camX: number, camY: number, season: { snow: number; leaf: number; bloom: number; s: number }): void {
    // Weather around the camera: leaves in autumn, snow in winter, petals in spring.
    const mode = season.snow > 0.35 ? "snow" : season.s < 1 ? "leaf" : "petal";
    if (mode !== this.mode) {
      this.mode = mode;
      const leaf = ["#d9682b", "#c8442a", "#e8a33c", "#b85a2a"], pet = ["#f3b6c8", "#fff4dc", "#f6d35b"];
      this.wd.forEach((q, i) => this.weather.setColorAt(i, C(mode === "snow" ? "#f4f7fa" : mode === "leaf" ? leaf[Math.floor(q.c * 4)]! : pet[Math.floor(q.c * 3)]!)));
      this.weather.instanceColor!.needsUpdate = true;
    }
    const density = Math.max(season.leaf * 0.55, season.snow, season.bloom * 0.35);
    const motion = this.reduceMotion ? 0.25 : 1;
    this.wd.forEach((q, i) => {
      const sp = mode === "snow" ? 1 : mode === "leaf" ? 1.5 : 0.8;
      q.y -= q.v * sp * dt * motion;
      q.x += Math.sin(time * 1.2 + q.ph) * (mode === "snow" ? 0.4 : 1.2) * dt * motion;
      q.rot += q.rv * dt * motion;
      // Wrap around the camera so a big camera move keeps the spread instead of bunching into a line.
      const wrap = (v: number, lo: number, span: number) => lo + ((((v - lo) % span) + span) % span);
      if (q.y < camY - 12 || q.y > camY + 18) q.y = wrap(q.y, camY - 12, 30);
      if (q.x < camX - 28 || q.x > camX + 28) q.x = wrap(q.x, camX - 28, 56);
      const vis = q.k < density ? 1 : 0;
      this.dummy.position.set(q.x, q.y, q.z);
      this.dummy.rotation.set(Math.sin(q.rot) * 1.2, q.rot * 0.5, q.rot);
      const s = vis * (mode === "snow" ? 0.55 : 1);
      this.dummy.scale.set(s * (mode === "leaf" ? 1.7 : 1), s * 0.8, 1);
      this.dummy.updateMatrix();
      this.weather.setMatrixAt(i, this.dummy.matrix);
    });
    this.weather.instanceMatrix.needsUpdate = true;

    // Scraps.
    for (let i = this.bitData.length - 1; i >= 0; i--) {
      const b = this.bitData[i]!;
      b.life -= dt;
      if (b.life <= 0) {
        this.bitData.splice(i, 1);
        continue;
      }
      b.vy -= b.grav * dt;
      b.vx *= 1 - dt * 1.5;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
    }
    this.bitData.forEach((b, i) => {
      const k = clamp(b.life / b.max, 0, 1);
      this.dummy.position.set(b.x, b.y, b.z);
      this.dummy.rotation.set(b.rot * 0.7, b.rot * 0.4, b.rot);
      this.dummy.scale.setScalar(b.size * (0.4 + 0.6 * k));
      this.dummy.updateMatrix();
      this.bits.setMatrixAt(i, this.dummy.matrix);
      this.bits.setColorAt(i, b.color);
    });
    this.bits.count = this.bitData.length;
    this.bits.instanceMatrix.needsUpdate = true;
    if (this.bits.instanceColor) this.bits.instanceColor.needsUpdate = true;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i]!;
      g.life -= dt;
      const k = 1 - Math.max(0, g.life) / g.max;
      const r = g.r0 + (g.r1 - g.r0) * (1 - Math.pow(1 - k, 2));
      g.m.scale.setScalar(Math.max(0.01, r));
      (g.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (g.life <= 0) {
        this.group.remove(g.m);
        (g.m.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i]!;
      a.life -= dt;
      (a.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, a.life / 0.12) * 0.85;
      if (a.life <= 0) {
        this.group.remove(a.m);
        (a.m.material as THREE.Material).dispose();
        this.arcs.splice(i, 1);
      }
    }
  }
}
