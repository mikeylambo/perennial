// EnemyDirector (GDD §11, §14): paper animals with one habit each and a readable tell before every attack.
// Tells never go below the tell table's minimum. AI decides at 30 Hz on the 120 Hz sim.
import { ENEMIES, type EnemyKind, type Item } from "../data/content.ts";
import { EMPTY, LOWCEIL, ONEWAY, SLOPE_DOWN, SLOPE_UP, SOLID, type World } from "./world.ts";

export type EnemyState = "idle" | "approach" | "tell" | "attack" | "recover" | "stagger" | "flee" | "circle" | "dead";
export type WolfMove = "lunge" | "pounce" | "howl";

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number; // feet
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  w: number;
  h: number;
  facing: 1 | -1;
  state: EnemyState;
  t: number; // time in state
  cooldown: number;
  home: { x: number; y: number };
  grounded: boolean;
  carrying: Item | null;
  hitFlash: number;
  /** Ids of verb activations that already hit this enemy (one hit per activation). */
  hitBy: Set<number>;
  target: { x: number; y: number };
  move: WolfMove | null;
  moves: number;
  awake: boolean;
  /** Dust burst (moth) and howl timing for presentation. */
  fx: number;
  spring: boolean;
}

export const TELL: Record<string, number> = {
  mite: 0.3,
  mudling: 0.3,
  rook: 0.4,
  hornet: 0.4,
  jay: 0.45,
  moth: 0.5,
  wolfling: 0.35,
  lunge: 0.55,
  pounce: 0.6,
  howl: 0.7,
};

export function makeEnemy(id: string, kind: EnemyKind, x: number, y: number, hp?: number): Enemy {
  const d = ENEMIES[kind];
  const flier = d.flier;
  return {
    id, kind, x, y: flier ? y + 1.5 : y, vx: 0, vy: 0,
    hp: hp ?? d.hp, maxHp: hp ?? d.hp, w: d.w, h: d.h,
    facing: -1, state: kind === "wolf" ? "circle" : "idle", t: 0, cooldown: 0.6,
    home: { x, y: flier ? y + 1.5 : y }, grounded: false, carrying: null, hitFlash: 0, hitBy: new Set(),
    target: { x, y }, move: null, moves: 0, awake: false, fx: 0, spring: d.season === "spring",
  };
}

/** Ground height under x within [low, high], or null. Center sample; slopes, solids, one-ways and ledges. */
export function groundAt(world: World, x: number, high: number, low: number): number | null {
  const cx = Math.floor(x);
  for (let cy = Math.floor(high); cy >= Math.floor(low) - 1; cy--) {
    const k = world.kind(cx, cy);
    let s: number | null = null;
    if (k === SOLID || k === LOWCEIL || k === ONEWAY) s = cy + 1;
    else if (k === SLOPE_UP) s = cy + (x - cx);
    else if (k === SLOPE_DOWN) s = cy + 1 - (x - cx);
    if (s !== null && s <= high + 1e-4 && s >= low - 1e-4) return s;
  }
  for (const l of world.ledges) if (x >= l.x0 && x <= l.x1 && l.y <= high && l.y >= low) return l.y;
  return null;
}

export function wallAt(world: World, x: number, y: number, h: number): boolean {
  const cx = Math.floor(x);
  for (let cy = Math.floor(y + 0.4); cy <= Math.floor(y + h); cy++) {
    const k = world.kind(cx, cy);
    if (k === SOLID || k === LOWCEIL) return true;
  }
  return false;
}

export function solidPoint(world: World, x: number, y: number): boolean {
  const k = world.kind(Math.floor(x), Math.floor(y));
  return k !== EMPTY && k !== ONEWAY;
}

/** Ground walker physics: gravity, floors, walls. Turns back at walls and ledges when `careful`. */
export function walk(world: World, e: Enemy, dt: number, careful: boolean): void {
  e.vy = Math.max(-16, e.vy - 30 * dt);
  const nx = e.x + e.vx * dt;
  const ahead = nx + Math.sign(e.vx) * e.w / 2;
  if (e.vx !== 0 && wallAt(world, ahead, e.y, e.h)) {
    e.vx = 0;
    if (careful) e.facing = (-e.facing) as 1 | -1;
  } else if (careful && e.grounded && e.vx !== 0 && groundAt(world, ahead, e.y + 0.4, e.y - 1.2) === null) {
    e.vx = 0;
    e.facing = (-e.facing) as 1 | -1;
  } else e.x = nx;
  const ny = e.y + e.vy * dt;
  if (e.vy <= 0) {
    const s = groundAt(world, e.x, e.y + (e.grounded ? 0.4 : 0.05), ny - (e.grounded ? 0.45 : 0));
    if (s !== null) {
      e.y = s;
      e.vy = 0;
      e.grounded = true;
    } else {
      e.y = ny;
      e.grounded = false;
    }
  } else {
    if (solidPoint(world, e.x, ny + e.h)) e.vy = 0;
    else e.y = ny;
    e.grounded = false;
  }
}
