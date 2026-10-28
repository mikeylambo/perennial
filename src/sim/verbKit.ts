// VerbKit (GDD §29.2): the three-slot pack. Each keepsake in a slot is one verb; scrap fills a slot with no verb.
// Verb timing lives in the simulation (sim.ts) and reads the numbers from data/tuning.ts.
import { isKeepsake, itemValue, KEEPSAKES, type Item, type KeepsakeDef } from "../data/content.ts";
import { TUNE } from "../data/tuning.ts";

export class Pack {
  slots: Array<Item | null> = Array.from({ length: TUNE.slots }, () => null);
  /** Slot used by bury and swap; picked with 1/2/3 (or d-pad) while holding bury. */
  selected = 0;

  get full(): boolean {
    return this.slots.every(Boolean);
  }
  get empty(): boolean {
    return this.slots.every((s) => !s);
  }
  count(): number {
    return this.slots.filter(Boolean).length;
  }

  /** Puts an item in the first free slot. Returns the slot, or -1 when full. */
  add(item: Item): number {
    const i = this.slots.findIndex((s) => !s);
    if (i < 0) return -1;
    this.slots[i] = { ...item };
    return i;
  }

  take(slot: number): Item | null {
    const it = this.slots[slot] ?? null;
    this.slots[slot] = null;
    return it;
  }

  /** Replace a slot; returns what was there. */
  swap(slot: number, item: Item): Item | null {
    const old = this.slots[slot] ?? null;
    this.slots[slot] = { ...item };
    return old;
  }

  has(id: string): boolean {
    return this.slots.some((s) => s?.id === id);
  }

  verb(slot: number): { def: KeepsakeDef; tier: number } | null {
    const it = this.slots[slot];
    if (!it || !isKeepsake(it.id)) return null;
    return { def: KEEPSAKES[it.id], tier: it.tier };
  }

  /** Default bury/swap slot: keep the player's pick if it holds something, else the first filled slot. */
  settleSelection(): void {
    if (this.slots[this.selected]) return;
    const i = this.slots.findIndex(Boolean);
    this.selected = i < 0 ? 0 : i;
  }

  best(): Item | null {
    let best: Item | null = null;
    for (const s of this.slots) if (s && (!best || itemValue(s) > itemValue(best))) best = s;
    return best;
  }
}
