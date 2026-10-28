// SeasonPlots (GDD §29.2, production §1): plots, burial, growth, rot, landmarks, harvest, replanting.
// Pure and renderer-free so it can move to the Shell (and to C# or GDScript) unchanged.
import { isKeepsake, type Item } from "../data/content.ts";
import { TUNE } from "../data/tuning.ts";

export type PlotBand = "autumn" | "winter";

export interface Plot {
  id: string;
  band: PlotBand;
  /** Bottom-to-top order on the face, used for the rise order at the turn. */
  order: number;
  item: Item | null;
  /** Tier the burial will grow into (computed at burial; scrap grows to 0). */
  grows: number;
  /** Set at the turn. */
  landmark: null | { kind: "landmark" | "stump"; tier: number; harvested: boolean };
}

export interface BuryResult {
  plot: Plot;
  grows: number;
  seedUsed: number;
  overflow: number;
}

export interface SeasonPlotsState {
  seed: number;
  plots: Array<Pick<Plot, "id" | "item" | "grows" | "landmark">>;
}

export class SeasonPlots {
  readonly plots: Plot[];
  /** Overflow past T4 becomes a seed that adds +1 to the next burial. */
  seed = 0;

  constructor(sockets: ReadonlyArray<{ id: string; band: PlotBand; order: number }>) {
    this.plots = sockets.map((s) => ({ ...s, item: null, grows: 0, landmark: null }));
  }

  get(id: string): Plot {
    const p = this.plots.find((q) => q.id === id);
    if (!p) throw new Error(`Unknown plot ${id}`);
    return p;
  }

  canBury(id: string): boolean {
    const p = this.get(id);
    return p.item === null && p.landmark === null;
  }

  /** Growth = tier + band bonus (+ seed), capped at T4; overflow becomes the next seed. Never negative. */
  static growth(item: Item, band: PlotBand, seed: number): { grows: number; overflow: number } {
    if (!isKeepsake(item.id)) return { grows: 0, overflow: 0 };
    const bonus = band === "winter" ? TUNE.winterBonus : TUNE.autumnBonus;
    const raw = Math.max(1, item.tier) + bonus + seed;
    return { grows: Math.min(TUNE.tierCap, raw), overflow: Math.max(0, raw - TUNE.tierCap) };
  }

  bury(id: string, item: Item): BuryResult {
    if (!this.canBury(id)) throw new Error(`Plot ${id} is taken`);
    const p = this.get(id);
    const keepsake = isKeepsake(item.id);
    const seedUsed = keepsake ? this.seed : 0;
    const { grows, overflow } = SeasonPlots.growth(item, p.band, seedUsed);
    if (keepsake) this.seed = overflow;
    p.item = { ...item };
    p.grows = grows;
    return { plot: p, grows, seedUsed, overflow };
  }

  /** The turn: every buried keepsake becomes a landmark of its grown tier; scrap rots into a stump. Bottom first. */
  turn(): Plot[] {
    const risen = this.plots.filter((p) => p.item).sort((a, b) => a.order - b.order);
    for (const p of risen) p.landmark = { kind: isKeepsake(p.item!.id) ? "landmark" : "stump", tier: p.grows, harvested: false };
    return risen;
  }

  /** Take the evolved keepsake from the top of a landmark. */
  harvest(id: string): Item {
    const p = this.get(id);
    if (!p.landmark || p.landmark.kind !== "landmark" || p.landmark.harvested || !p.item) throw new Error(`Nothing to harvest at ${id}`);
    p.landmark.harvested = true;
    return { id: p.item.id, tier: p.landmark.tier };
  }

  /** A new year: last year's landmarks fold back into the ground; plots are open again. The seed carries over. */
  newYear(): void {
    for (const p of this.plots) {
      p.item = null;
      p.grows = 0;
      p.landmark = null;
    }
  }

  snapshot(): SeasonPlotsState {
    return { seed: this.seed, plots: this.plots.map(({ id, item, grows, landmark }) => ({ id, item: item && { ...item }, grows, landmark: landmark && { ...landmark } })) };
  }

  restore(s: SeasonPlotsState): void {
    this.seed = s.seed;
    for (const q of s.plots) {
      const p = this.plots.find((x) => x.id === q.id);
      if (!p) continue; // content changed: unknown plots are dropped, known ones keep their state
      p.item = q.item && { ...q.item };
      p.grows = q.grows;
      p.landmark = q.landmark && { ...q.landmark };
    }
  }
}
