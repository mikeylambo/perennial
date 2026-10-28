// Paper materials and cut-shape helpers, promoted from the look test (docs/data/look-test.html).
// Every surface is a paper stock: matte, grainy, slightly bumped, with real thickness and real shadows.
import * as THREE from "three";

export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const backOut = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export const C = (h: string | number) => new THREE.Color(h);
export type Keys = [THREE.Color, THREE.Color, THREE.Color];
export const K = (a: string, b: string, c: string): Keys => [C(a), C(b), C(c)];
/** Season value s: 0 autumn, 1 winter, 2 spring. */
export function seasonColor(keys: Keys, s: number, out: THREE.Color): THREE.Color {
  return s <= 1 ? out.copy(keys[0]).lerp(keys[1], s) : out.copy(keys[1]).lerp(keys[2], s - 1);
}
export const sval = (a: number, b: number, c: number, s: number) => (s <= 1 ? a + (b - a) * s : b + (c - b) * (s - 1));

let grain: THREE.CanvasTexture | null = null;
/** Generated paper grain: fibres and tooth. Scanned stocks replace it in the art pass (art bible §10). */
export function paperTexture(): THREE.CanvasTexture {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f2efe9";
  g.fillRect(0, 0, 512, 512);
  const id = g.getImageData(0, 0, 512, 512), d = id.data, r = rng(7);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 22;
    d[i] = d[i]! + n;
    d[i + 1] = d[i + 1]! + n;
    d[i + 2] = d[i + 2]! + n;
  }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < 1400; i++) {
    g.strokeStyle = `rgba(110,98,86,${0.03 + r() * 0.06})`;
    g.lineWidth = 0.6 + r();
    const x = r() * 512, y = r() * 512, a = r() * Math.PI * 2, l = 6 + r() * 22;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(0.18, 0.18);
  grain.anisotropy = 4;
  grain.colorSpace = THREE.SRGBColorSpace;
  return grain;
}

export function mat(color: THREE.ColorRepresentation, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const paper = paperTexture();
  return new THREE.MeshStandardMaterial({ color, map: paper, bumpMap: paper, bumpScale: 0.018, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, ...opts });
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, shadow = true): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

export function poly(pts: ReadonlyArray<readonly [number, number]>): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i]![0], pts[i]![1]);
  s.closePath();
  return s;
}

export function slab(shapes: THREE.Shape | THREE.Shape[], depth = 0.05): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 6 });
}

export function circle(r: number, cx = 0, cy = 0): THREE.Shape {
  return new THREE.Shape().absarc(cx, cy, r, 0, Math.PI * 2, false);
}

/** A torn-edged blob, used for canopies, bushes and puffs. */
export function blob(rad: number, seed: number, squash = 0.86, n = 22): THREE.Shape {
  const rr = rng(seed), p: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = rad * (0.82 + rr() * 0.3);
    p.push([Math.cos(a) * k, Math.sin(a) * k * squash]);
  }
  return poly(p);
}

export function flame(cx: number, by: number, w: number, h: number, lean: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(cx - w / 2, by);
  s.bezierCurveTo(cx - w * 0.7, by + h * 0.45, cx - w * 0.1 + lean * 0.4, by + h * 0.7, cx + lean, by + h);
  s.bezierCurveTo(cx + w * 0.2 + lean * 0.5, by + h * 0.62, cx + w * 0.75, by + h * 0.4, cx + w / 2, by);
  s.closePath();
  return s;
}

/** Five-petal flower cut (spring dressing and blooms). */
export function flowerShape(r: number): THREE.Shape {
  const p: Array<[number, number]> = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const k = r * (0.55 + 0.45 * Math.abs(Math.cos(a * 2.5)));
    p.push([Math.cos(a) * k, Math.sin(a) * k]);
  }
  return poly(p);
}

/** Smooth 2D value noise in [0,1]. */
export function valueNoise(seed: number): (x: number, y: number) => number {
  const hash = (i: number, j: number) => {
    let h = (i * 374761393 + j * 668265263 + seed * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
