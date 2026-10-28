// Paper creatures and pickups. Silhouette first (rule 9): every enemy has its own outline and a tell motion.
import * as THREE from "three";
import { isKeepsake, type EnemyKind, type ItemId } from "../data/content.ts";
import type { Enemy } from "../sim/enemies.ts";
import { TELL } from "../sim/enemies.ts";
import { ICONS, ICON_COLOR } from "./icons.ts";
import { blob, circle, mat, mesh, poly, slab } from "./paper.ts";

interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  wings: THREE.Object3D[];
  legs: THREE.Object3D[];
  mats: THREE.MeshStandardMaterial[];
  base: THREE.Color[];
}

function rig(kind: EnemyKind): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const wings: THREE.Object3D[] = [];
  const legs: THREE.Object3D[] = [];
  const mats: THREE.MeshStandardMaterial[] = [];
  const m = (c: string) => {
    const x = mat(c);
    mats.push(x);
    return x;
  };
  const add = (shape: THREE.Shape, c: string, z = 0, parent: THREE.Object3D = body, depth = 0.04) => {
    const o = mesh(slab(shape, depth), m(c));
    o.position.z = z;
    parent.add(o);
    return o;
  };
  const eye = (x: number, y: number, z = 0.06) => add(circle(0.045, x, y), "#1d1a1f", z);
  switch (kind) {
    case "mite": {
      add(poly([[-0.35, 0.05], [0.0, 0.42], [0.36, 0.1], [0.05, -0.0]]), "#d9682b");
      add(poly([[-0.25, 0.12], [0.25, 0.22], [0.24, 0.24], [-0.25, 0.14]]), "#9c3f1a", 0.05);
      for (let i = 0; i < 3; i++) {
        const l = add(poly([[-0.02, 0.05], [0.02, 0.05], [0.06, -0.08], [0.02, -0.08]]), "#5a2a14", -0.02);
        l.position.x = -0.15 + i * 0.15;
        legs.push(l);
      }
      eye(0.2, 0.18);
      break;
    }
    case "mudling": {
      add(blob(0.36, 31, 0.7), "#7a5a3a");
      add(blob(0.2, 32, 0.6), "#94704a", 0.05).position.set(0.05, 0.08, 0.05);
      eye(0.14, 0.12);
      body.position.y = 0.25;
      break;
    }
    case "rook":
    case "hornet": {
      const hornet = kind === "hornet";
      if (hornet) {
        add(poly([[-0.35, 0.0], [-0.1, 0.18], [0.3, 0.12], [0.38, 0.0], [0.3, -0.12], [-0.1, -0.16]]), "#e3b23c");
        for (let i = 0; i < 2; i++) add(poly([[-0.12 + i * 0.16, 0.16], [-0.04 + i * 0.16, 0.16], [-0.04 + i * 0.16, -0.15], [-0.12 + i * 0.16, -0.15]]), "#2a2420", 0.05);
        add(poly([[-0.4, 0.0], [-0.55, 0.05], [-0.4, -0.05]]), "#2a2420");
      } else {
        add(poly([[-0.45, -0.05], [-0.1, 0.18], [0.25, 0.16], [0.36, 0.22], [0.52, 0.12], [0.36, 0.05], [0.2, -0.12], [-0.2, -0.16], [-0.55, -0.28]]), "#2a2730");
        add(poly([[0.5, 0.15], [0.68, 0.1], [0.5, 0.07]]), "#c9a24a", 0.05);
      }
      eye(hornet ? 0.26 : 0.38, hornet ? 0.04 : 0.15);
      for (let i = 0; i < 2; i++) {
        const wing = new THREE.Group();
        wing.position.set(-0.02, 0.1, i ? 0.08 : -0.08);
        const shape = hornet ? blob(0.22, 41 + i, 0.5, 12) : poly([[0, 0], [-0.25, 0.5], [-0.55, 0.42], [-0.4, 0.05]]);
        const w = mesh(slab(shape, 0.02), m(hornet ? "#f3f6f8" : "#3a3640"));
        if (hornet) w.position.set(-0.05, 0.18, 0);
        wing.add(w);
        body.add(wing);
        wings.push(wing);
      }
      body.position.y = 0.3;
      break;
    }
    case "jay": {
      add(poly([[-0.3, 0.1], [-0.05, 0.4], [0.25, 0.36], [0.4, 0.22], [0.25, 0.08], [0.1, -0.1], [-0.4, -0.05], [-0.62, 0.12], [-0.5, 0.0]]), "#5b7fb0");
      add(poly([[0.05, 0.38], [0.18, 0.6], [0.24, 0.36]]), "#3b5a88", 0.03);
      add(poly([[0.38, 0.24], [0.55, 0.2], [0.38, 0.16]]), "#3a3030", 0.05);
      add(poly([[-0.2, 0.1], [0.15, 0.2], [0.12, 0.04], [-0.18, 0.0]]), "#e8e2d6", 0.05);
      eye(0.26, 0.28);
      for (let i = 0; i < 2; i++) {
        const l = add(poly([[-0.02, 0], [0.02, 0], [0.03, -0.18], [-0.03, -0.18]]), "#3a3030", -0.02);
        l.position.set(-0.05 + i * 0.12, -0.04, 0);
        legs.push(l);
      }
      body.position.y = 0.2;
      break;
    }
    case "moth": {
      add(poly([[-0.08, -0.25], [0.08, -0.25], [0.06, 0.25], [-0.06, 0.25]]), "#d8d2c4", 0.06);
      for (let i = 0; i < 2; i++) {
        const wing = new THREE.Group();
        wing.position.set(0, 0, i ? 0.03 : 0.0);
        const s = i ? 1 : -1;
        wing.add(mesh(slab(poly([[0, 0.05], [s * 0.5, 0.35], [s * 0.6, 0.0], [s * 0.42, -0.3], [0, -0.1]]), 0.02), m("#efe9dc")));
        const spot = mesh(slab(circle(0.08, s * 0.35, 0.05), 0.02), m("#9fb2c6"));
        spot.position.z = 0.02;
        wing.add(spot);
        body.add(wing);
        wings.push(wing);
      }
      body.position.y = 0.3;
      break;
    }
    case "wolfling":
    case "wolf": {
      const big = kind === "wolf";
      const s = big ? 1.55 : 0.75;
      const fur = big ? "#e9edf1" : "#d9dee4", dark = big ? "#7d8a99" : "#8a96a4";
      const torso = poly([[-0.75, 0.35], [-0.4, 0.62], [0.35, 0.64], [0.6, 0.8], [0.9, 0.78], [1.05, 0.62], [0.82, 0.5], [0.55, 0.32], [0.3, 0.22], [-0.6, 0.2], [-0.9, 0.5], [-1.05, 0.62], [-0.88, 0.4]].map(([x, y]) => [x! * s, y! * s] as [number, number]));
      add(torso, fur, 0, body, 0.06);
      add(poly([[0.62 * s, 0.78 * s], [0.7 * s, 1.0 * s], [0.8 * s, 0.8 * s]]), dark, 0.07);
      add(poly([[-0.3 * s, 0.5 * s], [0.3 * s, 0.56 * s], [0.3 * s, 0.53 * s], [-0.3 * s, 0.47 * s]]), dark, 0.07);
      add(poly([[-0.1 * s, 0.6 * s], [0.12 * s, 0.33 * s], [0.1 * s, 0.31 * s], [-0.12 * s, 0.58 * s]]), dark, 0.07);
      eye(0.85 * s, 0.68 * s, 0.08);
      for (let i = 0; i < 4; i++) {
        const l = new THREE.Group();
        l.position.set((i < 2 ? 0.45 : -0.45) * s + (i % 2) * 0.12 * s, 0.25 * s, i % 2 ? 0.04 : -0.04);
        l.add(mesh(slab(poly([[-0.06 * s, 0], [0.06 * s, 0], [0.05 * s, -0.27 * s], [-0.05 * s, -0.27 * s]]), 0.04), m(i % 2 ? fur : dark)));
        body.add(l);
        legs.push(l);
      }
      break;
    }
  }
  return { root, body, wings, legs, mats, base: mats.map((x) => x.color.clone()) };
}

export class ActorLayer {
  readonly group = new THREE.Group();
  private rigs = new Map<string, Rig>();
  private items = new Map<string, THREE.Group>();

  syncEnemies(list: Enemy[], time: number): void {
    const seen = new Set<string>();
    for (const e of list) {
      seen.add(e.id);
      let r = this.rigs.get(e.id);
      if (!r) {
        r = rig(e.kind);
        this.rigs.set(e.id, r);
        this.group.add(r.root);
      }
      this.pose(r, e, time);
    }
    for (const [id, r] of this.rigs)
      if (!seen.has(id)) {
        this.group.remove(r.root);
        this.rigs.delete(id);
      }
  }

  private pose(r: Rig, e: Enemy, time: number): void {
    r.root.position.set(e.x, e.y, 0.25);
    r.root.scale.set(e.facing, 1, 1);
    r.root.visible = e.awake || e.state === "dead" || true;
    const dead = e.state === "dead";
    // Death fold: the cut folds up and blows away.
    if (dead) {
      const k = Math.min(1, e.t / 1.0);
      r.body.rotation.x = -k * 1.5;
      r.body.scale.setScalar(Math.max(0.0001, 1 - k));
      r.root.position.y += k * 1.2;
      r.root.position.x += k * 0.6;
      return;
    }
    r.body.rotation.set(0, 0, 0);
    r.body.scale.set(1, 1, 1);
    // Tells: the body creases backward along a fold line (wolves), wings fold tight (birds), wings open (moth).
    const tellK = e.state === "tell" ? Math.min(1, e.t / (TELL[e.move ?? e.kind] ?? 0.4)) : 0;
    if (e.kind === "wolf" || e.kind === "wolfling") {
      r.body.rotation.z = e.state === "tell" ? (e.move === "howl" ? 0.45 * tellK : 0.22 * tellK) : e.state === "attack" ? -0.12 : 0;
      r.body.scale.x = 1 - 0.18 * tellK;
      r.body.position.x = -0.25 * tellK;
      const run = e.state === "attack" || Math.abs(e.vx) > 1 ? time * 14 : 0;
      r.legs.forEach((l, i) => (l.rotation.z = Math.sin(run + i * 1.7) * 0.6));
    } else if (e.kind === "rook" || e.kind === "hornet") {
      const flap = e.state === "tell" ? 0.2 : Math.sin(time * (e.kind === "hornet" ? 40 : 12)) * 0.9;
      r.wings.forEach((w, i) => (w.rotation.x = (i ? 1 : -1) * flap));
      r.body.rotation.z = e.state === "attack" ? Math.atan2(e.vy, Math.abs(e.vx) + 0.01) : Math.sin(time * 3) * 0.05;
    } else if (e.kind === "moth") {
      const open = e.state === "tell" ? 0.2 + 0.8 * tellK : 0.5 + Math.sin(time * 9) * 0.4;
      r.wings.forEach((w) => (w.scale.x = Math.max(0.15, open)));
    } else {
      r.body.scale.y = 1 - 0.3 * tellK;
      r.body.scale.x = 1 + 0.2 * tellK;
      const step = Math.abs(e.vx) > 0.3 ? time * 18 : 0;
      r.legs.forEach((l, i) => (l.rotation.z = Math.sin(step + i * 2) * 0.5));
    }
    if (e.state === "stagger") r.body.rotation.z += Math.sin(e.t * 40) * 0.12;
    // Hit flash: a tear-white edge.
    const flash = e.hitFlash > 0;
    r.mats.forEach((m, i) => (flash ? m.color.set("#ffffff") : m.color.copy(r.base[i]!)));
    if (e.carrying) r.body.position.y = Math.sin(time * 20) * 0.03;
  }

  syncPickups(list: Array<{ id: string; item: { id: ItemId; tier: number }; x: number; y: number }>, time: number): void {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.id);
      let g = this.items.get(p.id);
      if (!g) {
        g = new THREE.Group();
        const pts = ICONS[p.item.id].map(([x, y]): [number, number] => [x * 0.7, y * 0.7]);
        const icon = mesh(slab(poly(pts), 0.05), mat(ICON_COLOR[p.item.id], { emissive: new THREE.Color(ICON_COLOR[p.item.id]), emissiveIntensity: isKeepsake(p.item.id) ? 0.25 : 0 }));
        icon.name = "icon";
        g.add(icon);
        if (isKeepsake(p.item.id)) {
          // A small shrine plinth under keepsakes.
          const plinth = mesh(slab(poly([[-0.45, -0.75], [0.45, -0.75], [0.35, -0.55], [-0.35, -0.55]]), 0.2), mat("#b8a78c"));
          g.add(plinth);
          for (let t = 1; t < p.item.tier; t++) {
            const pip = mesh(slab(circle(0.06, -0.2 + t * 0.12, -0.65), 0.02), mat("#2a2730"), false);
            pip.position.z = 0.21;
            g.add(pip);
          }
        }
        this.items.set(p.id, g);
        this.group.add(g);
      }
      g.position.set(p.x, p.y + 0.75, 0.15);
      const icon = g.getObjectByName("icon")!;
      icon.position.y = Math.sin(time * 2 + p.x) * 0.08;
      icon.rotation.y = Math.sin(time * 1.2 + p.x) * 0.5;
    }
    for (const [id, g] of this.items)
      if (!seen.has(id)) {
        this.group.remove(g);
        this.items.delete(id);
      }
  }
}
