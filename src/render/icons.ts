// Keepsake and scrap silhouettes (GDD §13: every icon distinguishable as a silhouette at 32 px).
// One source for the HUD (SVG) and the world (extruded paper). Coordinates in a unit box, y up.
import type { ItemId } from "../data/content.ts";

type P = Array<[number, number]>;

const blade: P = [
  [0.0, 0.5], [0.09, 0.3], [0.08, -0.12], [0.3, -0.12], [0.3, -0.2], [0.07, -0.2], [0.07, -0.42], [0.12, -0.5],
  [-0.12, -0.5], [-0.07, -0.42], [-0.07, -0.2], [-0.3, -0.2], [-0.3, -0.12], [-0.08, -0.12], [-0.09, 0.3],
];

function shieldShape(): P {
  const p: P = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 0.42 : 0.5;
    p.push([Math.cos(a) * r, Math.sin(a) * r * 1.05]);
  }
  return p;
}

const hook: P = [
  [0.06, 0.5], [0.06, -0.18], [0.02, -0.34], [-0.1, -0.4], [-0.22, -0.34], [-0.26, -0.2], [-0.32, -0.08], [-0.4, -0.18],
  [-0.36, -0.38], [-0.22, -0.5], [-0.02, -0.5], [0.14, -0.4], [0.18, -0.2], [0.18, 0.38], [0.26, 0.44], [0.2, 0.5],
];

const lantern: P = [
  [-0.06, 0.5], [0.06, 0.5], [0.06, 0.4], [0.24, 0.3], [0.3, 0.22], [0.26, -0.3], [0.32, -0.36], [0.32, -0.5],
  [-0.32, -0.5], [-0.32, -0.36], [-0.26, -0.3], [-0.3, 0.22], [-0.24, 0.3], [-0.06, 0.4],
];

const nail: P = [
  [-0.3, 0.5], [0.3, 0.5], [0.3, 0.38], [0.07, 0.38], [0.07, 0.02], [0.3, -0.28], [0.22, -0.36], [-0.04, -0.06],
  [-0.07, -0.06], [-0.07, 0.38], [-0.3, 0.38],
];

const cup: P = [
  [-0.36, 0.34], [0.26, 0.34], [0.22, 0.12], [0.36, 0.12], [0.44, 0.0], [0.38, -0.16], [0.18, -0.2], [0.1, -0.36],
  [-0.24, -0.36], [-0.3, -0.1], [-0.06, 0.0], [-0.34, 0.12],
];

export const ICONS: Record<ItemId, P> = {
  "ks.blade": blade,
  "ks.shield": shieldShape(),
  "ks.hook": hook,
  "ks.lantern": lantern,
  "scrap.nail": nail,
  "scrap.cup": cup,
};

export const ICON_COLOR: Record<ItemId, string> = {
  "ks.blade": "#e0ad48",
  "ks.shield": "#5d7f3e",
  "ks.hook": "#7b8a96",
  "ks.lantern": "#d98b2b",
  "scrap.nail": "#8d877c",
  "scrap.cup": "#a7a08f",
};

export function iconSvg(id: ItemId, size = 36, color?: string): string {
  const pts = ICONS[id].map(([x, y]) => `${((x + 0.5) * 100).toFixed(1)},${((0.5 - y) * 100).toFixed(1)}`).join(" ");
  return `<svg viewBox="-4 -4 108 108" width="${size}" height="${size}" aria-hidden="true"><polygon points="${pts}" fill="${color ?? ICON_COLOR[id]}" stroke="rgba(40,28,18,.55)" stroke-width="3" stroke-linejoin="round"/></svg>`;
}
