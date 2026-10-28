// Content data with semantic IDs (GDD §30, content sheets in docs/data). Phase 0 ships four keepsakes and two scrap.

export type Family = "strike" | "guard" | "move" | "tend";
export type KeepsakeId = "ks.blade" | "ks.shield" | "ks.hook" | "ks.lantern";
export type ScrapId = "scrap.nail" | "scrap.cup";
export type ItemId = KeepsakeId | ScrapId;

export interface KeepsakeDef {
  id: KeepsakeId;
  family: Family;
  verb: "blade" | "shield" | "hook" | "lantern";
  names: readonly [string, string, string, string]; // T1..T4
  landmark: string;
}

export const KEEPSAKES: Record<KeepsakeId, KeepsakeDef> = {
  "ks.blade": { id: "ks.blade", family: "strike", verb: "blade", names: ["Ember Blade", "Sunblade", "Daybreak", "Noonfire"], landmark: "Sunblade tree" },
  "ks.shield": { id: "ks.shield", family: "guard", verb: "shield", names: ["Bramble Shield", "Thorn Bastion", "Briar Keep", "Rosewall"], landmark: "Thorn hedge" },
  "ks.hook": { id: "ks.hook", family: "move", verb: "hook", names: ["Fish Hook", "Anchor Hook", "Grapnel", "Skyline"], landmark: "Hook pine" },
  "ks.lantern": { id: "ks.lantern", family: "tend", verb: "lantern", names: ["Tallow Lantern", "Hearth Lantern", "Beacon", "Lighthouse"], landmark: "Beacon" },
};

export const SCRAP: Record<ScrapId, { id: ScrapId; name: string }> = {
  "scrap.nail": { id: "scrap.nail", name: "Bent Nail" },
  "scrap.cup": { id: "scrap.cup", name: "Cracked Cup" },
};

export interface Item {
  id: ItemId;
  tier: number; // keepsakes 1..4; scrap 0
}

export const isKeepsake = (id: ItemId): id is KeepsakeId => id.startsWith("ks.");
export const itemName = (it: Item): string =>
  isKeepsake(it.id) ? KEEPSAKES[it.id].names[Math.max(0, Math.min(3, it.tier - 1))]! : SCRAP[it.id as ScrapId].name;

/** How good an item is, for telemetry ("did they bury their best?"). */
export const itemValue = (it: Item): number => (isKeepsake(it.id) ? it.tier * 10 + (it.id === "ks.blade" ? 2 : it.id === "ks.shield" ? 1 : 0) : 0);

export type Stock = "plain" | "tissue" | "card" | "felt" | "wax" | "foil";
export type EnemyKind = "mite" | "rook" | "jay" | "moth" | "wolfling" | "mudling" | "hornet" | "wolf";

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  stock: Stock;
  w: number;
  h: number;
  season: "descent" | "spring" | "any";
  flier: boolean;
  /** Can be bounced off by crumple and killed by stomp in one go. */
  small: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  mite: { kind: "mite", hp: 1, stock: "tissue", w: 0.7, h: 0.45, season: "descent", flier: false, small: true },
  rook: { kind: "rook", hp: 3, stock: "card", w: 0.9, h: 0.6, season: "descent", flier: true, small: false },
  jay: { kind: "jay", hp: 2, stock: "tissue", w: 0.7, h: 0.6, season: "descent", flier: false, small: true },
  moth: { kind: "moth", hp: 2, stock: "tissue", w: 0.8, h: 0.6, season: "descent", flier: true, small: true },
  wolfling: { kind: "wolfling", hp: 3, stock: "plain", w: 1.1, h: 0.7, season: "descent", flier: false, small: false },
  mudling: { kind: "mudling", hp: 1, stock: "wax", w: 0.7, h: 0.5, season: "spring", flier: false, small: true },
  hornet: { kind: "hornet", hp: 2, stock: "tissue", w: 0.7, h: 0.5, season: "spring", flier: true, small: true },
  wolf: { kind: "wolf", hp: 30, stock: "plain", w: 2.2, h: 1.4, season: "descent", flier: false, small: false },
};

/** Damage multipliers by paper stock (content §10). */
export const STOCK_MULT: Record<Stock, { cut: number; blunt: number; fire: number }> = {
  plain: { cut: 1, blunt: 1, fire: 1 },
  tissue: { cut: 2, blunt: 1, fire: 2 },
  card: { cut: 0.5, blunt: 1.5, fire: 1 },
  wax: { cut: 1, blunt: 1, fire: 3 },
  foil: { cut: 0.5, blunt: 2, fire: 0 },
  felt: { cut: 1.5, blunt: 0.25, fire: 1.5 },
};

export const LETTER: readonly string[] = [
  "To whoever plants after me,",
  "I don't know your name. I've stopped needing to.",
  "This valley was green when I was young. I spent it.",
  "I kept the best seed back, for a better year. It never came.",
  "So I'm sending you what I should have sown.",
  "It will feel like losing. Plant it anyway.",
  "The cold will ask what you kept. Answer honestly.",
  "Spring never asks. It only answers.",
  "I won't see what you grow. That was always the point.",
  "When your hands are empty, you'll be ready.",
  "Then write to whoever comes after you.",
  "— the last gardener of the Fallow",
];
