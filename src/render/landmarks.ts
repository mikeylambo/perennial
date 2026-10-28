// Landmarks: burials risen as hinged pop-up sculptures (art bible §5, GDD §10 "Landmark rise").
// Pieces unfold base to crown with a 0.4 s stagger; climbable ledges are lighter deckled paper.
import * as THREE from "three";
import type { ItemId } from "../data/content.ts";
import { TUNE } from "../data/tuning.ts";
import type { LandmarkInfo } from "../sim/sim.ts";
import { backOut, blob, circle, clamp, flame, flowerShape, mat, mesh, poly, rng, slab } from "./paper.ts";

interface Piece { pivot: THREE.Group; delay: number; ry: number }

export interface LandmarkVisual {
  id: string;
  item: ItemId;
  tier: number;
  group: THREE.Group;
  pieces: Piece[];
  bloom: THREE.Group;
  start: number;
  span: number;
  plucked: number;
  light: { x: number; y: number; color: number; power: number } | null;
  info: LandmarkInfo;
  moving: THREE.Object3D[];
}

const ledgeMat = () => mat("#efe6d2");

function piece(shape: THREE.Shape | THREE.Shape[], m: THREE.Material, x: number, y: number, z: number, delay: number, ry = 0, depth = 0.04): Piece {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  pivot.add(mesh(slab(shape, depth), m));
  return { pivot, delay, ry };
}

export function buildLandmark(info: LandmarkInfo, start: number): LandmarkVisual {
  const item = info.plot.item!.id;
  const tier = info.plot.landmark!.tier;
  const H = info.height;
  const cx = info.harvestX;
  const g = new THREE.Group();
  g.position.set(cx, info.base, -0.35);
  const pieces: Piece[] = [];
  const r = rng(Math.round(cx * 100 + info.base));
  const n = Math.max(1, Math.ceil(H / TUNE.ledgeStep));
  const step = H / n;
  const rise = (y: number) => clamp(y / Math.max(1, H), 0, 1) * Math.min(2.0, 0.6 + H * 0.12);
  const moving: THREE.Object3D[] = [];
  let light: LandmarkVisual["light"] = null;
  const ledgeShape = (w: number) => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 12; i++) pts.push([-w / 2 + (i / 12) * w, 0.02 + (r() - 0.5) * 0.03]);
    const under = pts.slice().reverse().map(([x]): [number, number] => [x * 0.96, -0.16 - r() * 0.04]);
    return poly([...pts, ...under]);
  };
  // Base soil fold.
  pieces.push(piece(poly([[-1.3, -0.1], [1.3, -0.1], [1.0, 0.35], [-1.0, 0.35]]), mat("#5c3320"), 0, 0, 0.42, 0));

  if (item === "ks.blade") {
    // Sunblade tree: the blade as a trunk, crossguard branches at each ledge, flames at the crown.
    const gold = mat("#e0ad48"), bark = mat("#8a4b26");
    pieces.push(piece(poly([[-0.32, 0.2], [0.32, 0.2], [0.24, H + 0.4], [0, H + 1.4], [-0.24, H + 0.4]]), gold, 0, 0, 0, 0.05));
    for (let k = 1; k <= n; k++) {
      const y = step * k;
      pieces.push(piece(ledgeShape(2.6), ledgeMat(), 0, y, 0.38, rise(y)));
      pieces.push(piece(poly([[-1.5, -0.32], [1.5, -0.32], [1.3, -0.12], [-1.3, -0.12]]), bark, 0, y, 0.3, rise(y) + 0.03));
    }
    const ft = H + 0.2;
    const f1 = mat("#d9582a", { emissive: new THREE.Color("#5a1a00"), emissiveIntensity: 0.5 }), f2 = mat("#f0a23a", { emissive: new THREE.Color("#6a3a00"), emissiveIntensity: 0.5 }), f3 = mat("#ffd36b", { emissive: new THREE.Color("#6a5a10"), emissiveIntensity: 0.6 });
    const fl = [piece(flame(-0.9, ft, 1.0, 2.0, -0.5), f1, -0.1, 0, 0.12, rise(H) + 0.1, 0.25), piece(flame(0.9, ft, 1.0, 2.0, 0.5), f1, 0.1, 0, 0.12, rise(H) + 0.14, -0.25), piece(flame(0, ft + 0.6, 0.8, 1.8, 0), f2, 0, 0, 0.2, rise(H) + 0.2), piece(flame(0, ft + 1.2, 0.5, 1.2, 0), f3, 0, 0, 0.28, rise(H) + 0.26)];
    pieces.push(...fl);
    if (tier >= 4) moving.push(...fl.map((p) => p.pivot));
    light = { x: cx, y: info.base + H + 1.2, color: 0xffb050, power: 1.2 + tier * 0.4 };
  } else if (item === "ks.shield") {
    // Thorn hedge: stacked thorned panels with red berries; boards at each ledge.
    const panel = (w: number, h: number) => {
      const p: Array<[number, number]> = [[-w / 2, 0], [w / 2, 0]];
      const m = Math.max(6, Math.round(h * 2));
      for (let i = 0; i <= m; i++) p.push([w / 2 - 0.02 + (i % 2 ? 0.22 : 0), h * 0.08 + (i / m) * h * 0.84]);
      p.push([0, h]);
      for (let i = m; i >= 0; i--) p.push([-w / 2 + 0.02 - (i % 2 ? 0.22 : 0), h * 0.08 + (i / m) * h * 0.84]);
      return poly(p);
    };
    pieces.push(piece(panel(2.4, H + 0.6), mat("#3f5a2c"), -0.2, 0, -0.1, 0.0, 0.3));
    pieces.push(piece(panel(2.8, H + 0.2), mat("#5d7f3e"), 0, 0, 0.1, 0.1));
    pieces.push(piece(panel(1.8, H * 0.7 + 0.4), mat("#4c6b34"), 0.5, 0, 0.2, 0.18, -0.3));
    for (let k = 1; k <= n; k++) {
      const y = step * k;
      pieces.push(piece(ledgeShape(2.5), ledgeMat(), 0, y, 0.38, rise(y)));
    }
    const berry = mat("#b8322c");
    for (let i = 0; i < 4 + tier * 2; i++) pieces.push(piece(circle(0.12), berry, (r() - 0.5) * 2, 0.6 + r() * H, 0.34, 0.3 + rise(r() * H)));
  } else if (item === "ks.hook") {
    // Hook pine: a thin trunk with pine tiers at each ledge and hooks hanging at the grapple points.
    const bark = mat("#5a3d2a"), needles = mat("#2f5a3a"), needles2 = mat("#3f6e45"), iron = mat("#7b8a96");
    pieces.push(piece(poly([[-0.16, 0], [0.16, 0], [0.08, H + 1.2], [-0.08, H + 1.2]]), bark, 0, 0, 0, 0.05));
    for (let k = 1; k <= n; k++) {
      const y = step * k;
      const w = 2.8 - (k / n) * 1.0;
      pieces.push(piece(poly([[-w / 2, -0.5], [w / 2, -0.5], [0.1, 0.55], [-0.1, 0.55]]), k % 2 ? needles : needles2, 0, y, 0.1, rise(y) + 0.02));
      pieces.push(piece(ledgeShape(2.5), ledgeMat(), 0, y, 0.38, rise(y)));
    }
    pieces.push(piece(poly([[-0.7, 0], [0.7, 0], [0, 1.3]]), needles2, 0, H + 0.3, 0.12, rise(H) + 0.1));
    for (let y = 3; y <= H + 2; y += 3) {
      const hk = ICON_HOOK.map(([x, yy]): [number, number] => [x * 0.5 - 1.0, yy * 0.5 - 0.25]);
      pieces.push(piece(poly(hk), iron, 0, y, 0.45, rise(y) + 0.1));
    }
  } else {
    // Beacon: a stacked tower with a lit lantern room on top.
    const stoneA = mat("#8d8478"), stoneB = mat("#a39a8c"), glow = mat("#ffd36b", { emissive: new THREE.Color("#ffb040"), emissiveIntensity: 0.9 });
    let y = 0, i = 0;
    while (y < H) {
      const hgt = Math.min(0.9, H - y);
      const w = 1.7 - (y / Math.max(1, H)) * 0.5;
      pieces.push(piece(poly([[-w / 2, 0], [w / 2, 0], [w / 2 - 0.04, hgt], [-w / 2 + 0.04, hgt]]), i % 2 ? stoneA : stoneB, (r() - 0.5) * 0.08, y, 0.05, rise(y)));
      y += hgt;
      i++;
    }
    for (let k = 1; k <= n; k++) pieces.push(piece(ledgeShape(2.5), ledgeMat(), 0, step * k, 0.38, rise(step * k)));
    pieces.push(piece(poly([[-0.55, 0], [0.55, 0], [0.45, 0.9], [-0.45, 0.9]]), glow, 0, H + 0.1, 0.12, rise(H) + 0.1));
    pieces.push(piece(poly([[-0.75, 0], [0.75, 0], [0, 0.6]]), mat("#5a4636"), 0, H + 1.0, 0.14, rise(H) + 0.16));
    light = { x: cx, y: info.base + H + 0.6, color: 0xffc060, power: 1.6 + tier * 0.5 };
  }
  for (const p of pieces) {
    p.pivot.rotation.x = -Math.PI / 2;
    p.pivot.scale.setScalar(0.0001);
    g.add(p.pivot);
  }
  // The bloom: what you harvest at the top.
  const bloom = new THREE.Group();
  bloom.position.set(0, H + 0.55, 0.6);
  bloom.add(mesh(slab(flowerShape(0.34), 0.03), mat("#fff4dc", { emissive: new THREE.Color("#6a5a3a"), emissiveIntensity: 0.4 }), false));
  const ctr = mesh(slab(circle(0.12), 0.03), mat("#e8a03c"), false);
  ctr.position.z = 0.03;
  bloom.add(ctr);
  bloom.add(mesh(slab(blob(0.5, 9, 1, 14), 0.01), mat("#fff8e6", { transparent: true, opacity: 0.25 }), false));
  bloom.scale.setScalar(0.0001);
  g.add(bloom);
  const span = Math.max(...pieces.map((p) => p.delay)) + 0.6;
  return { id: info.plot.id, item, tier, group: g, pieces, bloom, start, span, plucked: 0, light, info, moving };
}

const ICON_HOOK: Array<[number, number]> = [
  [0.06, 0.5], [0.06, -0.18], [0.02, -0.34], [-0.1, -0.4], [-0.22, -0.34], [-0.26, -0.2], [-0.32, -0.08], [-0.4, -0.18],
  [-0.36, -0.38], [-0.22, -0.5], [-0.02, -0.5], [0.14, -0.4], [0.18, -0.2], [0.18, 0.38], [0.26, 0.44], [0.2, 0.5],
];

/** Animate a landmark. Returns how many pieces newly reached upright (for plucks and haptic ticks). */
export function animateLandmark(v: LandmarkVisual, time: number, harvested: boolean, reduceMotion: boolean): number {
  const t = time - v.start;
  let plucks = 0;
  for (const p of v.pieces) {
    const k = clamp((t - p.delay) / (reduceMotion ? 0.3 : 0.6), 0, 1);
    const e = k > 0 ? backOut(k) : 0;
    p.pivot.rotation.x = -(Math.PI / 2) * (1 - e);
    p.pivot.rotation.y = p.ry * e;
    p.pivot.scale.setScalar(Math.max(0.0001, Math.min(1, k * 4)));
    if (k >= 1 && !p.pivot.userData.done) {
      p.pivot.userData.done = true;
      plucks++;
    }
  }
  const b = clamp((t - v.span + 0.2) / 0.5, 0, 1);
  v.bloom.visible = !harvested;
  v.bloom.scale.setScalar(Math.max(0.0001, harvested ? 0.0001 : backOut(b)));
  v.bloom.rotation.z = Math.sin(time * 1.4) * 0.08;
  v.group.rotation.z = Math.sin(time * 1.3 + v.info.x) * 0.006 * Math.min(1, t);
  for (const m of v.moving) m.scale.y = 1 + Math.sin(time * 8 + m.position.x) * 0.1;
  return plucks;
}
