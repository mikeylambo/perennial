// The face as one tile grid (GDD §29.1): rooms stitched side by side, two season states, dynamic ledges.
// Pure and renderer-free. World units are tiles with y pointing up.
import type { EnemyKind, ItemId } from "../data/content.ts";

export type Band = "hearth" | "autumn" | "winter" | "floor";

export interface RoomDef {
  id: string;
  name: string;
  band: Band;
  entry: number;
  exit: number;
  finds: ItemId[];
  rows: string[];
}

export const EMPTY = 0, SOLID = 1, SLOPE_UP = 2, SLOPE_DOWN = 3, ONEWAY = 4, LOWCEIL = 5;
export type Kind = 0 | 1 | 2 | 3 | 4 | 5;

export interface RoomInfo {
  def: RoomDef;
  index: number;
  x0: number; // first column
  x1: number; // one past the last column
  top: number; // world y of the room's top edge
  bottom: number;
}

export interface PlotSocket { id: string; room: number; band: Band; cx: number; cy: number }
export interface FindSpot { id: string; room: number; item: ItemId; x: number; y: number }
export interface Spawn { id: string; room: number; kind: EnemyKind; x: number; y: number; spring: boolean }
export interface Ledge { id: string; x0: number; x1: number; y: number }

const SPRING_ENEMY: Record<string, EnemyKind> = { u: "mudling", h: "hornet" };
const DESCENT_ENEMY: Record<string, EnemyKind> = { m: "mite", r: "rook", j: "jay", f: "moth", l: "wolfling" };

export class World {
  readonly W: number;
  readonly H: number;
  readonly rooms: RoomInfo[] = [];
  readonly plots: PlotSocket[] = [];
  readonly finds: FindSpot[] = [];
  readonly spawns: Spawn[] = [];
  readonly anchors: Array<{ x: number; y: number }> = [];
  readonly heat: Array<{ x: number; y: number }> = [];
  readonly gates: number[] = [];
  hearth = { x: 0, y: 0 };
  guardian = { x: 0, y: 0 };
  /** After the turn the whole face is in spring. */
  spring = false;
  gateClosed = false;
  /** Dynamic one-way ledges (landmarks). */
  ledges: Ledge[] = [];
  /** Dynamic solid cells (stumps). */
  readonly stumps = new Set<number>();
  /** Spring thorns burned away by fire this year. */
  readonly burned = new Set<number>();
  private readonly cells: Uint8Array;

  constructor(defs: readonly RoomDef[]) {
    // Align each room's entry floor with the previous room's exit floor.
    const tops: number[] = [];
    let top = 0;
    defs.forEach((d, i) => {
      if (i > 0) top = top - defs[i - 1]!.exit + d.entry;
      tops.push(top);
    });
    const lowest = Math.min(...defs.map((d, i) => tops[i]! - d.rows.length));
    const shift = 2 - lowest;
    let x = 0;
    defs.forEach((def, i) => {
      const w = def.rows[0]!.length;
      for (const row of def.rows) if (row.length !== w) throw new Error(`Room ${def.id} has ragged rows`);
      const t = tops[i]! + shift;
      this.rooms.push({ def, index: i, x0: x, x1: x + w, top: t, bottom: t - def.rows.length });
      x += w;
    });
    this.W = x;
    this.H = Math.max(...this.rooms.map((r) => r.top)) + 24;
    this.cells = new Uint8Array(this.W * this.H);
    for (const room of this.rooms) {
      const { def } = room;
      for (let cx = room.x0; cx < room.x1; cx++)
        for (let cy = 0; cy < this.H; cy++) this.cells[cy * this.W + cx] = cy >= room.top ? 46 : 35; // '.' sky above, '#' rock below
      let findIndex = 0;
      def.rows.forEach((row, r) => {
        const cy = room.top - r - 1;
        for (let c = 0; c < row.length; c++) {
          const cx = room.x0 + c;
          let ch = row[c]!;
          const id = `${def.id}:${c},${r}`;
          if (ch === "P") this.plots.push({ id, room: room.index, band: def.band, cx, cy });
          else if (ch === "K") {
            const item = def.finds[findIndex++];
            if (!item) throw new Error(`Room ${def.id} has more finds than items`);
            this.finds.push({ id, room: room.index, item, x: cx + 0.5, y: cy });
          } else if (ch === "o") this.anchors.push({ x: cx + 0.5, y: cy + 0.5 });
          else if (ch === "F") this.heat.push({ x: cx + 0.5, y: cy + 0.5 });
          else if (ch === "H") this.hearth = { x: cx + 0.5, y: cy };
          else if (ch === "G") this.guardian = { x: cx + 0.5, y: cy };
          else if (ch === "g") { this.gates.push(cy * this.W + cx); }
          else if (DESCENT_ENEMY[ch]) this.spawns.push({ id, room: room.index, kind: DESCENT_ENEMY[ch]!, x: cx + 0.5, y: cy, spring: false });
          else if (SPRING_ENEMY[ch]) this.spawns.push({ id, room: room.index, kind: SPRING_ENEMY[ch]!, x: cx + 0.5, y: cy, spring: true });
          else {
            this.cells[cy * this.W + cx] = ch.charCodeAt(0);
            continue;
          }
          ch = ".";
          this.cells[cy * this.W + cx] = 46;
        }
      });
      if (findIndex !== def.finds.length) throw new Error(`Room ${def.id} lists more finds than K markers`);
    }
  }

  char(cx: number, cy: number): string {
    if (cx < 0 || cx >= this.W || cy < 0) return "#";
    if (cy >= this.H) return ".";
    return String.fromCharCode(this.cells[cy * this.W + cx]!);
  }

  /** Collision kind of a cell in the current season. */
  kind(cx: number, cy: number): Kind {
    if (cx < 0 || cx >= this.W || cy < 0) return SOLID;
    if (cy >= this.H) return EMPTY;
    const i = cy * this.W + cx;
    if (this.stumps.has(i)) return SOLID;
    if (this.gateClosed && this.gates.includes(i)) return SOLID;
    switch (this.cells[i]) {
      case 35: return SOLID; // #
      case 47: return SLOPE_UP; // /
      case 92: return SLOPE_DOWN; // \
      case 61: return ONEWAY; // =
      case 110: return LOWCEIL; // n
      case 118: return this.spring ? ONEWAY : EMPTY; // v
      case 119: return this.spring ? EMPTY : SOLID; // w
      default: return EMPTY;
    }
  }

  thorns(cx: number, cy: number): boolean {
    const c = this.char(cx, cy);
    if (c === "^") return true;
    return c === "t" && this.spring && !this.burned.has(cy * this.W + cx);
  }

  burn(cx: number, cy: number): boolean {
    if (this.char(cx, cy) !== "t" || !this.spring) return false;
    const i = cy * this.W + cx;
    if (this.burned.has(i)) return false;
    this.burned.add(i);
    return true;
  }

  damp(cx: number, cy: number): boolean {
    return this.char(cx, cy) === "~";
  }

  roomAt(x: number): RoomInfo {
    for (const r of this.rooms) if (x < r.x1) return r;
    return this.rooms[this.rooms.length - 1]!;
  }

  /** The band a column shows right now: everything is spring after the turn. */
  seasonAt(x: number): "autumn" | "winter" | "spring" {
    if (this.spring) return "spring";
    const b = this.roomAt(x).def.band;
    return b === "winter" || b === "floor" ? "winter" : "autumn";
  }
}
