// The run simulation: one face, three years. Owns all mutable game state (GDD §29.3) and runs at 120 Hz.
// Presentation reads state and drains semantic events; it never writes back.
import { DeterministicRng } from "@slu/web-shell";
import { isKeepsake, itemName, itemValue, KEEPSAKES, LETTER, STOCK_MULT, type Item, type ItemId } from "../data/content.ts";
import { EMBERFELL_FACE_1 } from "../data/rooms/emberfell.ts";
import { hitstop, TUNE as T, tierDamage, VERB } from "../data/tuning.ts";
import { PaperBody } from "./body.ts";
import { groundAt, makeEnemy, solidPoint, TELL, walk, type Enemy } from "./enemies.ts";
import { SeasonPlots, type Plot } from "./seasonPlots.ts";
import { Pack } from "./verbKit.ts";
import { World, type RoomDef } from "./world.ts";

export const DT = 1 / T.tickRate;

export interface Input {
  x: number;
  up: boolean;
  down: boolean;
  jump: boolean;
  slide: boolean;
  verb: [boolean, boolean, boolean];
  act: boolean;
  /** 1..3 pressed this frame (keyboard digits, d-pad left/right while holding act). */
  pick: number;
}

export const NO_INPUT: Input = { x: 0, up: false, down: false, jump: false, slide: false, verb: [false, false, false], act: false, pick: 0 };

export type Phase = "descent" | "guardian" | "turn" | "climb" | "hearth" | "torn" | "done";

export interface SimEvent { id: string; [k: string]: unknown }

export interface Pickup {
  id: string;
  item: Item;
  x: number;
  y: number;
  kind: "find" | "drop";
}

export interface LandmarkInfo {
  plot: Plot;
  x: number; // plot center
  base: number; // ground y
  height: number;
  top: number;
  harvestX: number;
}

export interface Burial { year: number; item: Item; band: string; grows: number; best: boolean; room: string; beforeGuardian: boolean }

interface Verb {
  slot: number;
  kind: "blade" | "shield" | "hook" | "lantern";
  tier: number;
  t: number;
  serial: number;
  chain: number;
  queued: boolean;
  pressedAt: number;
}

const ZONE_DAMP = 0.25;

export class Sim {
  readonly world: World;
  readonly body: PaperBody;
  readonly pack = new Pack();
  readonly plots: SeasonPlots;
  readonly rng: DeterministicRng;
  phase: Phase = "descent";
  year = 1;
  time = 0;
  yearTime = 0;
  creases: number = T.creases;
  damp = 0;
  invuln = 0;
  hitstun = 0;
  freeze = 0;
  enemies: Enemy[] = [];
  pickups: Pickup[] = [];
  landmarks: LandmarkInfo[] = [];
  dampZones: Array<{ x0: number; x1: number; y0: number; y1: number; t: number }> = [];
  verb: Verb | null = null;
  verbCooldown = [0, 0, 0];
  verbBuffer: Array<{ slot: number; t: number }> = [];
  blocking = false;
  blockPressedAt = -9;
  /** Bury or swap hold progress (0..1) and target. */
  hold: null | { kind: "bury" | "swap"; target: string; t: number } = null;
  standT = 0;
  turnT = 0;
  turnLength = 0;
  turnsSeen = 0;
  guardianMax = 0;
  roomIndex = 0;
  letterLines = 0;
  /** The keepsake the camera and HUD point at near the player (pickup, bloom or plot). */
  near: null | { kind: "plot" | "find" | "bloom" | "hearth"; id: string; x: number; y: number } = null;
  stats = { creasesLost: 0, tiersGrown: 0, tallest: 0, yearsDone: 0, burials: [] as Burial[], harvests: [] as Item[], firstPlotHesitation: -1, kills: 0 };
  readonly events: SimEvent[] = [];
  prev: Input = NO_INPUT;
  private serial = 0;
  private nearFirstPlotT = 0;
  private taken = new Set<string>();

  constructor(seed = 1, rooms: readonly RoomDef[] = EMBERFELL_FACE_1) {
    this.world = new World(rooms);
    this.rng = new DeterministicRng(seed);
    const order = [...this.world.plots].sort((a, b) => a.cy - b.cy);
    this.plots = new SeasonPlots(this.world.plots.map((p) => ({ id: p.id, band: p.band === "winter" ? "winter" : "autumn", order: order.indexOf(p) })));
    const h = this.world.hearth;
    this.body = new PaperBody(this.world, h.x + 1.5, h.y);
    this.startYear();
  }

  emit(id: string, data: Record<string, unknown> = {}): void {
    this.events.push({ id, ...data });
  }
  drain(): SimEvent[] {
    return this.events.splice(0);
  }

  get floor() {
    return this.world.rooms[this.world.rooms.length - 1]!;
  }
  get wolfParts(): Enemy[] {
    return this.enemies.filter((e) => (e.kind === "wolf" || e.id.startsWith("guardian")) && e.state !== "dead");
  }
  get guardianHp(): number {
    return this.wolfParts.reduce((s, e) => s + Math.max(0, e.hp), 0);
  }

  // ---------------------------------------------------------------- years

  private startYear(): void {
    const w = this.world;
    w.spring = false;
    w.gateClosed = false;
    w.ledges = [];
    w.stumps.clear();
    w.burned.clear();
    this.plots.newYear();
    this.landmarks = [];
    this.dampZones = [];
    this.phase = "descent";
    this.yearTime = 0;
    this.taken.clear();
    // Finds: a keepsake appears only if Folio isn't already carrying one of its kind. Scrap always.
    this.pickups = w.finds
      .filter((f) => !(isKeepsake(f.item) && this.pack.has(f.item)))
      .map((f) => ({ id: f.id, item: { id: f.item, tier: isKeepsake(f.item) ? 1 : 0 }, x: f.x, y: f.y, kind: "find" as const }));
    this.enemies = w.spawns.filter((s) => !s.spring).map((s) => makeEnemy(`${s.id}:y${this.year}`, s.kind, s.x, s.y));
    const h = w.hearth;
    const b = this.body;
    b.x = h.x + 1.5;
    b.y = h.y;
    b.vx = b.vy = 0;
    b.rope = null;
    b.form = "stand";
    b.facing = 1;
    this.damp = 0;
    this.roomIndex = 0;
    this.emit("year.start", { year: this.year });
  }

  /** Called by the Hearth screen. */
  continueYear(): void {
    if (this.phase !== "hearth") return;
    if (this.year >= T.years) {
      this.phase = "done";
      this.emit("run.done");
      return;
    }
    this.year++;
    this.startYear();
  }

  // ---------------------------------------------------------------- step

  step(inp: Input): void {
    const prev = this.prev;
    this.prev = inp;
    if (this.phase === "torn" || this.phase === "done" || this.phase === "hearth") return;
    this.time += DT;
    this.yearTime += DT;
    if (this.freeze > 0) {
      this.freeze -= DT;
      return;
    }
    if (this.phase === "turn") {
      this.turnT += DT;
      if (this.turnT >= this.turnLength) {
        this.phase = "climb";
        this.emit("climb.start");
      }
      return;
    }
    const b = this.body;
    const pressed = (now: boolean, before: boolean) => now && !before;
    const stunned = this.hitstun > 0;
    this.hitstun = Math.max(0, this.hitstun - DT);
    this.invuln = Math.max(0, this.invuln - DT);
    this.standT = Math.max(0, this.standT - DT);
    for (let i = 0; i < 3; i++) this.verbCooldown[i] = Math.max(0, this.verbCooldown[i]! - DT);

    // Hold (bury/swap): Folio kneels and is vulnerable.
    this.updateNear();
    this.updateHold(inp, prev);
    b.locked = this.hold !== null || this.standT > 0 || stunned;
    b.speedScale = this.blocking ? VERB.shield.blockSpeed : 1;

    const jumpPressed = pressed(inp.jump, prev.jump);
    b.step(DT, {
      x: stunned ? 0 : inp.x,
      up: inp.up,
      down: inp.down,
      jump: inp.jump && !stunned,
      jumpPressed: jumpPressed && !stunned && !b.locked,
      slidePressed: pressed(inp.slide, prev.slide) && !stunned,
    });
    for (const e of b.events.splice(0)) this.emit(e.id, e);

    // Interact (tap act or press up) on finds, blooms and the Hearth.
    if (!stunned && this.hold === null && (pressed(inp.act, prev.act) || (pressed(inp.up, prev.up) && !b.rope))) this.interact();

    // Verbs
    if (!stunned) this.updateVerbs(inp, prev);
    else this.blocking = false;

    this.updatePaper();
    this.updateEnemies();
    this.updateHazards();
    this.updateRooms();
  }

  // ---------------------------------------------------------------- interaction

  private plotNear(): Plot | null {
    const b = this.body;
    if (!b.grounded) return null;
    for (const s of this.world.plots) {
      if (Math.abs(b.x - (s.cx + 0.5)) < 1.1 && Math.abs(b.y - s.cy) < 0.6) {
        const p = this.plots.get(s.id);
        if (this.plots.canBury(s.id)) return p;
      }
    }
    return null;
  }

  private bloomNear(): LandmarkInfo | null {
    const b = this.body;
    for (const l of this.landmarks)
      if (l.plot.landmark?.kind === "landmark" && !l.plot.landmark.harvested && Math.abs(b.x - l.harvestX) < 1.6 && Math.abs(b.y - l.top) < 0.9) return l;
    return null;
  }

  private pickupNear(): Pickup | null {
    const b = this.body;
    let best: Pickup | null = null;
    for (const p of this.pickups) if (Math.abs(b.x - p.x) < 0.9 && Math.abs(b.y - p.y) < 1.0) best = p;
    return best;
  }

  private updateNear(): void {
    const b = this.body;
    const bloom = this.bloomNear();
    const find = this.pickupNear();
    const plot = this.phase === "descent" || this.phase === "guardian" ? this.plotNear() : null;
    if (bloom) this.near = { kind: "bloom", id: bloom.plot.id, x: bloom.harvestX, y: bloom.top };
    else if (find) this.near = { kind: "find", id: find.id, x: find.x, y: find.y };
    else if (plot) {
      const s = this.world.plots.find((q) => q.id === plot.id)!;
      this.near = { kind: "plot", id: plot.id, x: s.cx + 0.5, y: s.cy };
    } else this.near = null;
    // Telemetry: hesitation at the first plot while holding a keepsake.
    if (this.stats.firstPlotHesitation < 0 && this.near?.kind === "plot" && this.pack.slots.some((s) => s && isKeepsake(s.id))) this.nearFirstPlotT += DT;
    void b;
  }

  private interact(): void {
    const near = this.near;
    if (!near) return;
    if (near.kind === "find") {
      const p = this.pickups.find((q) => q.id === near.id)!;
      if (this.pack.full) {
        this.emit("pack.full", { item: p.item });
        return;
      }
      this.pack.add(p.item);
      this.pickups = this.pickups.filter((q) => q !== p);
      if (p.kind === "find") this.taken.add(p.id);
      this.pack.settleSelection();
      this.emit("item.pickup", { item: p.item, name: itemName(p.item), x: p.x, y: p.y });
    } else if (near.kind === "bloom") {
      if (this.pack.full) {
        this.emit("pack.full");
        return;
      }
      this.harvest(near.id, -1);
    }
  }

  private harvest(plotId: string, swapSlot: number): void {
    const l = this.landmarks.find((q) => q.plot.id === plotId)!;
    const item = this.plots.harvest(plotId);
    if (swapSlot >= 0) {
      const old = this.pack.swap(swapSlot, item);
      if (old) this.drop(old, this.body.x, this.body.y);
    } else this.pack.add(item);
    this.pack.settleSelection();
    this.stats.harvests.push(item);
    this.emit("landmark.harvest", { item, name: itemName(item), x: l.harvestX, y: l.top, plot: plotId });
    // Thorn hedge berries mend a crease once a year.
    if (item.id === "ks.shield" && this.creases < T.creases) {
      this.creases++;
      this.emit("crease.mend", { reason: "berries" });
    }
  }

  private drop(item: Item, x: number, y: number): void {
    this.pickups.push({ id: `drop:${++this.serial}`, item, x, y, kind: "drop" });
    this.emit("item.drop", { item, x, y });
  }

  private updateHold(inp: Input, prev: Input): void {
    const b = this.body;
    if (inp.pick >= 1 && inp.pick <= 3 && inp.pick !== prev.pick) {
      if (this.pack.slots[inp.pick - 1]) {
        this.pack.selected = inp.pick - 1;
        if (this.hold) this.hold.t = 0;
        this.emit("pack.select", { slot: inp.pick - 1 });
      }
    }
    if (this.hold) {
      const h = this.hold;
      const still =
        inp.act && b.grounded && b.form === "stand" &&
        (h.kind === "bury" ? this.near?.kind === "plot" && this.near.id === h.target : this.near && this.near.id === h.target);
      if (!still || !this.pack.slots[this.pack.selected]) {
        this.hold = null;
        this.emit("hold.cancel");
        return;
      }
      h.t += DT / T.buryHold;
      if (h.t >= 1) {
        this.hold = null;
        if (h.kind === "bury") this.completeBury(h.target);
        else this.completeSwap(h.target);
        this.standT = T.buryStand;
      }
      return;
    }
    if (!inp.act || prev.act === inp.act || !b.grounded || b.form !== "stand" || this.hitstun > 0) return;
    const near = this.near;
    if (!near) return;
    this.pack.settleSelection();
    if (!this.pack.slots[this.pack.selected]) return;
    if (near.kind === "plot") {
      this.hold = { kind: "bury", target: near.id, t: 0 };
      this.emit("hold.start", { kind: "bury" });
    } else if ((near.kind === "find" || near.kind === "bloom") && this.pack.full) {
      this.hold = { kind: "swap", target: near.id, t: 0 };
      this.emit("hold.start", { kind: "swap" });
    }
  }

  private completeBury(plotId: string): void {
    const slot = this.pack.selected;
    const best = this.pack.best();
    const item = this.pack.take(slot)!;
    const res = this.plots.bury(plotId, item);
    const sock = this.world.plots.find((p) => p.id === plotId)!;
    const wasBest = !!best && isKeepsake(item.id) && itemValue(item) >= itemValue(best);
    if (this.stats.firstPlotHesitation < 0) this.stats.firstPlotHesitation = this.nearFirstPlotT;
    this.stats.burials.push({ year: this.year, item, band: res.plot.band, grows: res.grows, best: wasBest, room: this.world.rooms[sock.room]!.def.name, beforeGuardian: this.phase === "descent" });
    if (isKeepsake(item.id)) this.stats.tiersGrown += res.grows - item.tier;
    this.pack.settleSelection();
    this.emit("item.bury", { item, plot: plotId, grows: res.grows, band: res.plot.band, x: sock.cx + 0.5, y: sock.cy, best: wasBest });
  }

  private completeSwap(target: string): void {
    const slot = this.pack.selected;
    const p = this.pickups.find((q) => q.id === target);
    if (p) {
      const old = this.pack.swap(slot, p.item);
      this.pickups = this.pickups.filter((q) => q !== p);
      if (old) this.drop(old, p.x, p.y);
      this.emit("item.pickup", { item: p.item, name: itemName(p.item), x: p.x, y: p.y, swapped: old });
      return;
    }
    if (this.landmarks.some((l) => l.plot.id === target)) this.harvest(target, slot);
  }

  // ---------------------------------------------------------------- verbs

  private updateVerbs(inp: Input, prev: Input): void {
    const b = this.body;
    for (let i = 0; i < 3; i++) if (inp.verb[i] && !prev.verb[i]) this.verbBuffer.push({ slot: i, t: 0.1 });
    this.verbBuffer = this.verbBuffer.filter((q) => (q.t -= DT) > 0);
    const usable = b.form === "stand" || b.form === "dart";
    // Shield: hold to block.
    const shieldSlot = this.pack.slots.findIndex((s) => s?.id === "ks.shield");
    const wasBlocking = this.blocking;
    this.blocking = usable && this.hold === null && shieldSlot >= 0 && !!inp.verb[shieldSlot] && (!this.verb || this.verb.kind === "shield");
    if (this.blocking && !wasBlocking) {
      this.blockPressedAt = this.time;
      this.emit("verb.use", { verb: "shield", tier: this.pack.slots[shieldSlot]!.tier });
    }

    const v = this.verb;
    if (v) {
      v.t += DT;
      if (v.kind === "blade") this.bladeTick(v);
      else if (v.kind === "lantern") this.lanternTick(v);
      const len = this.verbLength(v);
      if (v.t >= len) {
        if (v.kind === "blade" && v.queued && v.chain < VERB.blade.chain) {
          v.chain++;
          v.t = 0;
          v.queued = false;
          v.serial = ++this.serial;
          this.emit("verb.use", { verb: "blade", tier: v.tier, chain: v.chain });
        } else this.verb = null;
      }
    }
    if (!usable || this.hold) return;
    for (const q of this.verbBuffer) {
      const kit = this.pack.verb(q.slot);
      if (!kit) {
        q.t = 0;
        continue;
      }
      const kind = kit.def.verb;
      if (kind === "shield") {
        q.t = 0;
        continue;
      }
      if (this.verb) {
        // Strike chains on presses inside the recovery window; mashing never skips recovery.
        if (this.verb.kind === "blade" && kind === "blade" && this.verb.t > VERB.blade.startup) {
          this.verb.queued = true;
          q.t = 0;
        }
        continue;
      }
      if (this.verbCooldown[q.slot]! > 0) continue;
      q.t = 0;
      if (b.form === "dart") b.form = "stand";
      this.startVerb(q.slot, kind, kit.tier);
    }
  }

  private verbLength(v: Verb): number {
    if (v.kind === "blade") return VERB.blade.startup + VERB.blade.active + VERB.blade.recovery;
    if (v.kind === "lantern") return VERB.lantern.startup + VERB.lantern.active + VERB.lantern.recovery;
    return 0.15;
  }

  private startVerb(slot: number, kind: Verb["kind"], tier: number): void {
    const v: Verb = { slot, kind, tier, t: 0, serial: ++this.serial, chain: 1, queued: false, pressedAt: this.time };
    this.verb = v;
    this.emit("verb.use", { verb: kind, tier, chain: 1, slot });
    if (kind === "hook") this.throwHook(tier, slot);
    if (kind === "lantern") this.verbCooldown[slot] = VERB.lantern.cooldown;
  }

  /** The blade's hitbox this tick, or null outside the active frames. */
  bladeBox(): null | { x0: number; x1: number; y0: number; y1: number; up: boolean } {
    const v = this.verb;
    if (!v || v.kind !== "blade") return null;
    const a = VERB.blade.startup, z = a + VERB.blade.active;
    if (v.t < a || v.t > z) return null;
    const b = this.body;
    const reach = VERB.blade.reach * (1 + VERB.blade.perTierReach * (v.tier - 1));
    if (this.prev.up && !b.grounded) return { x0: b.x - 0.7, x1: b.x + 0.7, y0: b.y + b.h - 0.1, y1: b.y + b.h + reach, up: true };
    if (this.prev.up) return { x0: b.x - 0.6, x1: b.x + 0.6, y0: b.y + 0.5, y1: b.y + b.h + reach, up: true };
    return b.facing > 0
      ? { x0: b.x - 0.1, x1: b.x + 0.3 + reach, y0: b.y - 0.1, y1: b.y + 1.15, up: false }
      : { x0: b.x - 0.3 - reach, x1: b.x + 0.1, y0: b.y - 0.1, y1: b.y + 1.15, up: false };
  }

  private bladeTick(v: Verb): void {
    const box = this.bladeBox();
    if (!box) return;
    const dmg = tierDamage(VERB.blade.damage, v.tier, VERB.blade.perTierDamage);
    for (const e of this.enemies) {
      if (e.state === "dead" || e.hitBy.has(v.serial)) continue;
      if (e.x + e.w / 2 < box.x0 || e.x - e.w / 2 > box.x1 || e.y + e.h < box.y0 || e.y > box.y1) continue;
      e.hitBy.add(v.serial);
      this.hurtEnemy(e, dmg, "cut", v.chain === 3, v.tier, this.body.facing);
    }
    // Tier 2+ blades burn spring thorns they touch (Sunblade: fire edge).
    if (v.tier >= 2) for (let x = Math.floor(box.x0); x <= Math.floor(box.x1); x++) for (let y = Math.floor(box.y0); y <= Math.floor(box.y1); y++) if (this.world.burn(x, y)) this.emit("thorns.burn", { x: x + 0.5, y: y + 0.5 });
  }

  private lanternTick(v: Verb): void {
    const a = VERB.lantern.startup;
    if (v.t < a || v.t - DT >= a) return;
    const b = this.body;
    const r = VERB.lantern.radius * (1 + 0.15 * (v.tier - 1));
    const dmg = tierDamage(VERB.lantern.damage, v.tier, 0.6);
    this.emit("lantern.flare", { x: b.x, y: b.cy, r, tier: v.tier });
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      if (Math.hypot(e.x - b.x, e.y + e.h / 2 - b.cy) > r + e.w / 2) continue;
      this.hurtEnemy(e, dmg, "fire", true, v.tier, Math.sign(e.x - b.x) as 1 | -1);
    }
    for (let x = Math.floor(b.x - r); x <= Math.floor(b.x + r); x++)
      for (let y = Math.floor(b.cy - r); y <= Math.floor(b.cy + r); y++)
        if (Math.hypot(x + 0.5 - b.x, y + 0.5 - b.cy) <= r && this.world.burn(x, y)) this.emit("thorns.burn", { x: x + 0.5, y: y + 0.5 });
    if (this.damp > 0) {
      this.damp = Math.max(0, this.damp - VERB.lantern.dry);
      this.emit("paper.dry", { by: "lantern" });
    }
  }

  /** Anchor points: authored ones plus every Hook pine branch. */
  anchors(): Array<{ x: number; y: number }> {
    const extra = this.landmarks.filter((l) => l.plot.item?.id === "ks.hook").flatMap((l) => {
      const out: Array<{ x: number; y: number }> = [];
      for (let y = l.base + 3; y <= l.top + 2; y += 3) out.push({ x: l.x, y });
      return out;
    });
    return [...this.world.anchors, ...extra];
  }

  private throwHook(tier: number, slot: number): void {
    const b = this.body;
    const range = VERB.hook.range + VERB.hook.rangePerTier * (tier - 1);
    this.verbCooldown[slot] = VERB.hook.cooldown;
    if (b.rope) {
      b.rope = null;
      this.emit("hook.release");
      return;
    }
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const a of this.anchors()) {
      const dx = a.x - b.x, dy = a.y - b.cy;
      const d = Math.hypot(dx, dy);
      if (d > range || dy < 0.5) continue;
      if (dx * b.facing < -1.5) continue; // forward and up, a little behind is fine
      const score = d - dx * b.facing * 0.3;
      if (score < bestD) {
        bestD = score;
        best = a;
      }
    }
    if (best) {
      b.rope = { x: best.x, y: best.y, len: Math.max(1.5, Math.hypot(best.x - b.x, best.y - b.cy) * 0.92) };
      this.emit("hook.attach", { x: best.x, y: best.y });
      return;
    }
    // No anchor: the hook snags the nearest enemy in front.
    let target: Enemy | null = null;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      const dx = (e.x - b.x) * b.facing;
      if (dx < 0 || dx > range * 0.7 || Math.abs(e.y + e.h / 2 - b.cy) > 1.2) continue;
      if (!target || Math.abs(e.x - b.x) < Math.abs(target.x - b.x)) target = e;
    }
    this.emit("hook.throw", { x: b.x + b.facing * (target ? Math.abs(target.x - b.x) : range * 0.7), y: target ? target.y + target.h / 2 : b.cy, hit: !!target });
    if (target) {
      this.hurtEnemy(target, tierDamage(VERB.hook.damage, tier, 0.6), "blunt", false, tier, b.facing);
      if (target.kind !== "wolf" && target.state !== "dead") {
        target.vx = -b.facing * 7;
        target.state = "stagger";
        target.t = 0;
      }
    }
  }

  // ---------------------------------------------------------------- damage

  hurtEnemy(e: Enemy, amount: number, type: "cut" | "blunt" | "fire", heavy: boolean, tier: number, dir: 1 | -1): void {
    const stock = e.kind === "wolf" || e.id.startsWith("guardian") ? "plain" : (STOCK_MULT_KIND[e.kind] ?? "plain");
    const mult = STOCK_MULT[stock][type];
    const dmg = amount * mult;
    e.hp -= dmg;
    e.hitFlash = 0.12;
    const big = e.kind === "wolf";
    if (!big && e.state !== "dead") {
      const kb = { tissue: 6, plain: 3.5, card: 2, felt: 2, wax: 3, foil: 2 }[stock] * (heavy ? 1.4 : 1);
      e.vx = dir * kb;
      if (!e.grounded && e.kind !== "rook" && e.kind !== "hornet" && e.kind !== "moth") e.vy = 3;
      if (e.state !== "flee") {
        e.state = "stagger";
        e.t = 0;
      }
    }
    this.freeze = Math.max(this.freeze, hitstop(tier, heavy));
    this.emit("enemy.hit", { kind: e.kind, stock, type, x: e.x, y: e.y + e.h / 2, heavy, dmg });
    if (e.hp <= 0.001) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.state = "dead";
    e.t = 0;
    this.stats.kills++;
    this.emit("enemy.die", { kind: e.kind, x: e.x, y: e.y + e.h / 2, id: e.id });
    if (e.carrying) {
      this.drop(e.carrying, e.x, Math.max(e.y, groundAt(this.world, e.x, e.y + 1, e.y - 20) ?? e.y));
      e.carrying = null;
    }
    if (e.id.startsWith("guardian") || e.kind === "wolf") this.checkGuardian();
  }

  /** Folio takes a hit from a direction. Shield blocks the front; a press inside the window parries. */
  hurtFolio(amount: number, fromX: number, source: Enemy | null, opts: { unblockable?: boolean; hazard?: boolean } = {}): boolean {
    const b = this.body;
    if (this.invuln > 0 || this.phase === "turn") return false;
    if (b.dodging && !opts.hazard) {
      this.emit("dodge.perfect", { x: b.x, y: b.cy });
      return false;
    }
    const front = Math.sign(fromX - b.x) === b.facing || Math.abs(fromX - b.x) < 0.2;
    if (this.blocking && front && !opts.unblockable && !opts.hazard) {
      const shield = this.pack.slots.find((s) => s?.id === "ks.shield");
      const tier = shield?.tier ?? 1;
      const win = VERB.shield.parry + VERB.shield.parryPerTier * (tier - 1);
      if (this.time - this.blockPressedAt <= win && source) {
        source.state = "stagger";
        source.t = 0;
        source.cooldown = VERB.shield.stagger;
        source.vx = b.facing * 4;
        this.emit("parry", { x: (b.x + source.x) / 2, y: b.cy, tier });
        this.freeze = Math.max(this.freeze, 0.07);
        this.hurtEnemy(source, tierDamage(VERB.shield.riposte, tier, 0.6), "cut", true, tier, b.facing);
        this.invuln = 0.2;
      } else {
        b.vx = -b.facing * 3;
        this.emit("block", { x: b.x + b.facing * 0.5, y: b.cy });
        this.invuln = 0.25;
      }
      return false;
    }
    this.creases -= amount;
    this.stats.creasesLost += amount;
    this.invuln = T.afterHitInvuln;
    this.hitstun = T.hitstun;
    this.hold = null;
    b.rope = null;
    if (b.form === "dart") b.form = "stand";
    const dir = Math.sign(b.x - fromX) || -b.facing;
    b.vx = dir * T.knockback * 2;
    b.vy = 6;
    b.grounded = false;
    this.verb = null;
    this.freeze = Math.max(this.freeze, 0.06);
    this.emit("crease.take", { left: this.creases, x: b.x, y: b.cy });
    if (this.creases <= 0) {
      this.creases = 0;
      this.phase = "torn";
      this.emit("torn", { x: b.x, y: b.cy });
    }
    return true;
  }

  // ---------------------------------------------------------------- paper, hazards, rooms

  private updatePaper(): void {
    const b = this.body;
    const w = this.world;
    let soaking = false;
    for (let cx = Math.floor(b.x - b.w / 2); cx <= Math.floor(b.x + b.w / 2); cx++)
      for (let cy = Math.floor(b.y); cy <= Math.floor(b.y + b.h); cy++) if (w.damp(cx, cy)) soaking = true;
    for (const z of this.dampZones) if (b.x > z.x0 && b.x < z.x1 && b.y >= z.y0 - 0.1 && b.y < z.y1) soaking = true;
    this.dampZones = this.dampZones.filter((z) => (z.t -= DT) > 0);
    const before = this.damp;
    const heat = this.heatNear();
    if (soaking) this.damp = Math.min(1, this.damp + T.dampGainSnow * DT);
    else if (heat) this.damp = Math.max(0, this.damp - T.dampDryHeat * DT);
    else this.damp = Math.max(0, this.damp - (w.seasonAt(b.x) === "winter" ? T.dampDryAirWinter : T.dampDryAir) * DT);
    if (this.damp >= 0.999 && !b.soaked) {
      b.soaked = true;
      this.emit("paper.soaked");
    } else if (b.soaked && this.damp < 0.5) {
      b.soaked = false;
      this.emit("paper.dry");
    }
    if (before === 0 && this.damp > 0) this.emit("paper.damp");
  }

  heatNear(): boolean {
    const b = this.body;
    for (const h of this.world.heat) if (Math.hypot(h.x - b.x, h.y - b.cy) < T.heatRadius) return true;
    if (Math.hypot(this.world.hearth.x - b.x, this.world.hearth.y - b.y) < 3) return true;
    for (const l of this.landmarks) {
      const id = l.plot.item?.id;
      if (id === "ks.blade" && Math.abs(b.x - l.x) < 4 && b.y > l.base - 2 && b.y < l.top + 3) return true;
      if (id === "ks.lantern" && Math.abs(b.x - l.x) < 4 + l.plot.landmark!.tier && b.y > l.base - 3 && b.y < l.top + 4) return true;
    }
    return false;
  }

  private updateHazards(): void {
    const b = this.body;
    if (this.phase === "torn") return;
    for (let cx = Math.floor(b.x - b.w / 2 + 0.05); cx <= Math.floor(b.x + b.w / 2 - 0.05); cx++)
      for (let cy = Math.floor(b.y + 0.05); cy <= Math.floor(b.y + b.h - 0.05); cy++)
        if (this.world.thorns(cx, cy)) {
          if (this.hurtFolio(1, cx + 0.5, null, { hazard: true })) {
            b.vy = 9;
            this.emit("thorns.hit", { x: cx + 0.5, y: cy + 0.5 });
          }
          return;
        }
    if (b.y < 0) this.hurtFolio(T.creases, b.x, null, { hazard: true });
  }

  private updateRooms(): void {
    const b = this.body;
    const room = this.world.roomAt(b.x);
    if (room.index !== this.roomIndex) {
      this.roomIndex = room.index;
      this.emit("room.enter", { room: room.def.id, name: room.def.name, band: room.def.band, index: room.index });
    }
    if (this.phase === "descent" && b.x > this.floor.x0 + 4 && b.grounded) this.startGuardian();
    if (this.phase === "climb" && room.def.band === "hearth" && b.x < room.x1 - 3 && b.grounded) {
      this.phase = "hearth";
      this.creases = T.creases;
      this.damp = 0;
      b.soaked = false;
      this.stats.yearsDone = this.year;
      if (this.letterLines < LETTER.length) this.letterLines++;
      this.hold = null;
      this.verb = null;
      b.rope = null;
      this.emit("hearth", { year: this.year, line: LETTER[this.letterLines - 1], lineIndex: this.letterLines });
    }
  }

  // ---------------------------------------------------------------- guardian and the turn

  private startGuardian(): void {
    this.phase = "guardian";
    this.world.gateClosed = true;
    const g = this.world.guardian;
    const hp = T.wolfHp[this.year] ?? T.wolfHp[3];
    const wolf = makeEnemy(`guardian:wolf:y${this.year}`, "wolf", g.x + 4, g.y, hp);
    wolf.awake = true;
    this.guardianMax = hp;
    // Leftover descent enemies leave the floor.
    for (const e of this.enemies) if (e.x > this.floor.x0 - 2 && e.state !== "dead") e.state = "dead";
    this.enemies.push(wolf);
    this.emit("guardian.start", { kind: "wolf", hp });
  }

  private checkGuardian(): void {
    if (this.phase !== "guardian") return;
    if (this.wolfParts.length > 0) return;
    this.emit("guardian.fall", { x: this.body.x });
    this.beginTurn();
  }

  private beginTurn(): void {
    const w = this.world;
    this.phase = "turn";
    this.turnT = 0;
    this.turnLength = this.turnsSeen === 0 ? T.turnFirst : T.turnLater;
    this.turnsSeen++;
    this.hold = null;
    this.verb = null;
    this.blocking = false;
    this.body.rope = null;
    this.dampZones = [];
    w.spring = true;
    w.gateClosed = false;
    for (const e of this.enemies) e.state = "dead";
    this.enemies = this.enemies.filter((e) => e.state !== "dead");
    const risen = this.plots.turn();
    this.landmarks = [];
    risen.forEach((p, i) => {
      const s = w.plots.find((q) => q.id === p.id)!;
      const L = p.landmark!;
      const x = s.cx + 0.5;
      if (L.kind === "stump") {
        w.stumps.add(s.cy * w.W + s.cx);
        this.emit("plot.rot", { plot: p.id, item: p.item, x, y: s.cy, order: i });
        return;
      }
      const height = T.landmarkHeight[L.tier] ?? 3;
      const n = Math.max(1, Math.ceil(height / T.ledgeStep));
      const step = height / n;
      for (let k = 1; k <= n; k++) w.ledges.push({ id: `${p.id}:${k}`, x0: s.cx - 0.2, x1: s.cx + 2.2, y: s.cy + step * k });
      const info: LandmarkInfo = { plot: p, x, base: s.cy, height, top: s.cy + height, harvestX: s.cx + 1 };
      this.landmarks.push(info);
      this.stats.tallest = Math.max(this.stats.tallest, L.tier);
      this.emit("landmark.rise", { plot: p.id, item: p.item, tier: L.tier, x, y: s.cy, height, order: i });
    });
    // If Folio stands where a landmark rose, lift it onto the nearest ledge so it never ends up inside one.
    this.emit("season.turn", { length: this.turnLength, first: this.turnsSeen === 1, count: risen.length });
    // Spring enemies, never within the spawn distance of Folio.
    for (const s of w.spawns)
      if (s.spring && Math.abs(s.x - this.body.x) >= T.spawnMinDistance) this.enemies.push(makeEnemy(`${s.id}:y${this.year}`, s.kind, s.x, s.y));
    // Unclaimed finds stay; dropped items stay for the year.
  }

  // ---------------------------------------------------------------- enemies

  private updateEnemies(): void {
    const b = this.body;
    // Only the six nearest awake enemies in view act (pacing law).
    const live = this.enemies.filter((e) => e.state !== "dead");
    for (const e of live) e.awake = e.kind === "wolf" || e.id.startsWith("guardian") || (Math.abs(e.x - b.x) < 15 && Math.abs(e.y - b.y) < 10);
    const awake = live.filter((e) => e.awake).sort((p, q) => Math.abs(p.x - b.x) - Math.abs(q.x - b.x)).slice(0, T.maxActiveInView);
    for (const e of awake) {
      e.t += DT;
      e.hitFlash = Math.max(0, e.hitFlash - DT);
      e.cooldown = Math.max(0, e.cooldown - DT);
      e.fx = Math.max(0, e.fx - DT);
      this.think(e);
      if (e.state === "dead") continue;
      this.contact(e);
    }
    for (const e of this.enemies) if (e.state === "dead") e.t += DT;
    this.enemies = this.enemies.filter((e) => e.state !== "dead" || e.t < 1.2);
  }

  private contact(e: Enemy): void {
    const b = this.body;
    if (e.state === "dead") return;
    const overlap = Math.abs(e.x - b.x) < (e.w + b.w) / 2 - 0.05 && b.y < e.y + e.h - 0.05 && b.y + b.h > e.y + 0.05;
    if (!overlap) return;
    // Stomp: falling onto an enemy's top half.
    if (b.vy < -1 && b.y > e.y + e.h * 0.45 && b.form !== "ball") {
      b.vy = T.stompBounce;
      b.grounded = false;
      b.jumping = false;
      this.emit("stomp", { x: b.x, y: b.y });
      this.hurtEnemy(e, T.stompDamage, "blunt", false, 1, b.facing);
      return;
    }
    // Crumple: small things pop off; big things stop the roll.
    if (b.form === "ball" && Math.abs(b.vx) > 6) {
      const big = !(e.kind === "mite" || e.kind === "mudling" || e.kind === "jay" || e.kind === "moth" || e.kind === "hornet");
      this.hurtEnemy(e, T.crumpleDamage, "blunt", big, 1, (Math.sign(b.vx) || 1) as 1 | -1);
      if (big) {
        b.vx = -b.vx * 0.45;
        b.vy = 5;
        b.grounded = false;
      }
      return;
    }
    if (e.kind === "moth") return; // moths only dust
    if (e.state === "stagger" && e.t < 0.3) return;
    if (e.kind === "jay" && e.state === "attack") {
      const scrapSlot = this.pack.slots.findIndex((s) => s && !isKeepsake(s.id));
      if (scrapSlot >= 0 && !e.carrying) {
        e.carrying = this.pack.take(scrapSlot);
        this.pack.settleSelection();
        e.state = "flee";
        e.t = 0;
        this.emit("item.stolen", { item: e.carrying, x: e.x, y: e.y });
        return;
      }
    }
    this.hurtFolio(1, e.x, e);
  }

  private think(e: Enemy): void {
    const b = this.body;
    const w = this.world;
    const dx = b.x - e.x;
    const dist = Math.abs(dx);
    const flier = e.kind === "rook" || e.kind === "hornet" || e.kind === "moth";
    if (e.state === "stagger") {
      e.vx *= 0.9;
      if (flier) {
        e.x += e.vx * DT;
        e.y += Math.sin(e.t * 20) * 0.002;
      } else walk(w, e, DT, false);
      if (e.t > (e.cooldown > 0 ? Math.max(0.35, e.cooldown) : 0.35)) {
        e.state = e.kind === "wolf" ? "circle" : "idle";
        e.t = 0;
        e.cooldown = 0.4;
      }
      return;
    }
    switch (e.kind) {
      case "mite":
      case "mudling":
        return this.crawler(e, dx, dist);
      case "wolfling":
        return this.lunger(e, dx, dist);
      case "jay":
        return this.thief(e, dx, dist);
      case "rook":
      case "hornet":
        return this.diver(e, dx, dist);
      case "moth":
        return this.duster(e, dist);
      case "wolf":
        return this.wolf(e, dx, dist);
    }
  }

  private crawler(e: Enemy, dx: number, dist: number): void {
    const speed = e.kind === "mudling" ? 1.6 : 2.2;
    const b = this.body;
    if (e.state === "tell") {
      e.vx = 0;
      if (e.t >= TELL[e.kind]!) {
        e.state = "attack";
        e.t = 0;
        e.vx = e.facing * 4.5;
        e.vy = 7;
        e.grounded = false;
      }
    } else if (e.state === "attack") {
      if (e.grounded && e.t > 0.1) {
        e.state = "recover";
        e.t = 0;
        e.vx = 0;
      }
    } else if (e.state === "recover") {
      e.vx = 0;
      if (e.t > 0.5) e.state = "idle";
    } else {
      const notice = dist < 6 && Math.abs(b.y - e.y) < 2.5;
      if (notice) {
        e.facing = dx > 0 ? 1 : -1;
        e.vx = e.facing * speed;
        if (dist < 1.8 && e.grounded && e.cooldown <= 0) {
          e.state = "tell";
          e.t = 0;
          e.cooldown = 1.2;
          this.emit("enemy.tell", { kind: e.kind, x: e.x, y: e.y });
        }
      } else {
        e.vx = e.facing * speed * 0.4;
        if (Math.abs(e.x - e.home.x) > 3) e.facing = e.x > e.home.x ? -1 : 1;
      }
    }
    walk(this.world, e, DT, e.state !== "attack");
  }

  private lunger(e: Enemy, dx: number, dist: number): void {
    const b = this.body;
    if (e.state === "tell") {
      e.vx = 0;
      if (e.t >= TELL.wolfling!) {
        e.state = "attack";
        e.t = 0;
        e.vx = e.facing * 9;
        this.emit("enemy.attack", { kind: e.kind, x: e.x, y: e.y });
      }
    } else if (e.state === "attack") {
      if (e.t > 0.35) {
        e.state = "recover";
        e.t = 0;
      }
    } else if (e.state === "recover") {
      e.vx *= 0.85;
      if (e.t > 0.6) {
        e.state = "idle";
        e.cooldown = 0.6;
      }
    } else {
      const notice = dist < 9 && Math.abs(b.y - e.y) < 3;
      if (notice) {
        e.facing = dx > 0 ? 1 : -1;
        e.vx = dist > 3 ? e.facing * 3.2 : 0;
        if (dist < 4 && e.cooldown <= 0 && e.grounded) {
          e.state = "tell";
          e.t = 0;
          this.emit("enemy.tell", { kind: e.kind, x: e.x, y: e.y });
        }
      } else e.vx = 0;
    }
    walk(this.world, e, DT, e.state !== "attack");
  }

  private thief(e: Enemy, dx: number, dist: number): void {
    const b = this.body;
    if (e.state === "flee") {
      e.facing = 1;
      e.vx = 5;
      if (e.grounded && e.t % 0.5 < DT) {
        e.vy = 5;
        e.grounded = false;
      }
      walk(this.world, e, DT, false);
      if (e.t > 8) {
        e.state = "dead"; // gone downhill with it for the year
        this.emit("thief.gone", { item: e.carrying });
      }
      return;
    }
    if (e.state === "tell") {
      e.vx = 0;
      if (e.t >= TELL.jay!) {
        e.state = "attack";
        e.t = 0;
        e.vx = e.facing * 6;
        e.vy = 5;
        e.grounded = false;
      }
    } else if (e.state === "attack") {
      if (e.grounded && e.t > 0.1) {
        e.state = "recover";
        e.t = 0;
      }
    } else if (e.state === "recover") {
      e.vx = 0;
      if (e.t > 0.6) e.state = "idle";
    } else {
      const notice = dist < 7 && Math.abs(b.y - e.y) < 3;
      if (notice) {
        e.facing = dx > 0 ? 1 : -1;
        e.vx = dist > 2.5 ? e.facing * 2.6 : 0;
        if (e.grounded && dist > 2.5 && e.t % 0.6 < DT) {
          e.vy = 4;
          e.grounded = false;
        }
        if (dist < 3 && e.grounded && e.cooldown <= 0) {
          e.state = "tell";
          e.t = 0;
          e.cooldown = 1.5;
          this.emit("enemy.tell", { kind: e.kind, x: e.x, y: e.y });
        }
      } else e.vx = 0;
    }
    walk(this.world, e, DT, e.state !== "attack");
  }

  private diver(e: Enemy, dx: number, dist: number): void {
    const b = this.body;
    const fast = e.kind === "hornet";
    if (e.state === "tell") {
      e.vx *= 0.8;
      if (e.t >= TELL[e.kind]!) {
        e.state = "attack";
        e.t = 0;
        const tx = e.target.x - e.x, ty = e.target.y - (e.y + e.h / 2);
        const d = Math.hypot(tx, ty) || 1;
        const sp = fast ? 13 : 11;
        e.vx = (tx / d) * sp;
        e.vy = (ty / d) * sp;
        this.emit("enemy.attack", { kind: e.kind, x: e.x, y: e.y });
      }
    } else if (e.state === "attack") {
      e.x += e.vx * DT;
      e.y += e.vy * DT;
      if (solidPoint(this.world, e.x, e.y) || solidPoint(this.world, e.x, e.y + e.h)) {
        e.y -= e.vy * DT;
        e.x -= e.vx * DT;
        e.state = "recover";
        e.t = 0;
        this.emit("enemy.bonk", { x: e.x, y: e.y });
      } else if (e.t > 0.9) {
        e.state = "recover";
        e.t = 0;
      }
      return;
    } else {
      // Hover and drift toward Folio, keeping altitude above it; recover climbs back up slowly (punish window).
      const notice = dist < 10 && Math.abs(b.y - e.y) < 9;
      const alt = notice ? Math.max(b.y + 3.2, Math.min(e.home.y + 2, b.y + 5)) : e.home.y;
      const hx = notice ? b.x - Math.sign(dx || 1) * 2.5 : e.home.x + Math.sin(this.time * 0.7) * 2;
      const rate = e.state === "recover" ? 0.8 : fast ? 3.4 : 2.4;
      e.vx += (Math.sign(hx - e.x) * rate - e.vx) * Math.min(1, DT * 3);
      e.vy += (Math.sign(alt - e.y) * Math.min(rate, Math.abs(alt - e.y) * 2) - e.vy) * Math.min(1, DT * 3);
      const nx = e.x + e.vx * DT, ny = e.y + e.vy * DT;
      if (!solidPoint(this.world, nx, ny + e.h / 2)) {
        e.x = nx;
        e.y = ny;
      } else e.vy = 1.5;
      e.facing = dx > 0 ? 1 : -1;
      if (e.state === "recover" && e.t > 1.0) e.state = "idle";
      if (notice && e.state === "idle" && e.cooldown <= 0 && dist < 5.5 && e.y > b.y + 1.5) {
        e.state = "tell";
        e.t = 0;
        e.cooldown = fast ? 1.4 : 2.0;
        e.target = { x: b.x, y: b.y + 0.4 };
        this.emit("enemy.tell", { kind: e.kind, x: e.x, y: e.y });
      }
    }
  }

  private duster(e: Enemy, dist: number): void {
    const b = this.body;
    e.x = e.home.x + Math.sin(this.time * 0.9 + e.home.x) * 1.4;
    e.y = e.home.y + Math.sin(this.time * 2.1 + e.home.y) * 0.4;
    if (e.state === "tell") {
      if (e.t >= TELL.moth!) {
        e.state = "recover";
        e.t = 0;
        e.fx = 0.6;
        this.emit("moth.dust", { x: e.x, y: e.y + e.h / 2 });
        if (Math.hypot(b.x - e.x, b.cy - e.y) < 2.1 && !b.dodging) {
          this.damp = Math.min(1, this.damp + T.dampGainDust);
          this.emit("paper.damp", { by: "dust" });
        }
      }
    } else if (e.state === "recover") {
      if (e.t > 2.5) e.state = "idle";
    } else if (dist < 3.6 && Math.abs(b.y - e.y) < 3 && e.cooldown <= 0) {
      e.state = "tell";
      e.t = 0;
      e.cooldown = 3;
      this.emit("enemy.tell", { kind: e.kind, x: e.x, y: e.y });
    }
  }

  private wolf(e: Enemy, dx: number, dist: number): void {
    const b = this.body;
    const f = this.floor;
    const left = f.x0 + 3, right = f.x1 - 3;
    // Phase 2: below half, the wolf tears into three wolflings that share what's left.
    if (e.hp <= this.guardianMax / 2 && e.state !== "attack") {
      const share = Math.max(2, Math.ceil(e.hp / 3));
      e.state = "dead";
      e.t = 0;
      this.emit("guardian.phase", { phase: 2, x: e.x, y: e.y });
      this.freeze = Math.max(this.freeze, 0.12);
      for (let i = 0; i < 3; i++) {
        const c = makeEnemy(`guardian:pup${i}:y${this.year}`, "wolfling", e.x + (i - 1) * 1.6, e.y, share);
        c.awake = true;
        c.cooldown = 0.6 + i * 0.5;
        c.facing = dx > 0 ? 1 : -1;
        c.vy = 6;
        c.vx = (i - 1) * 4;
        this.enemies.push(c);
      }
      return;
    }
    const face = () => (e.facing = dx > 0 ? 1 : -1);
    switch (e.state) {
      case "circle": {
        // Pace at a distance between attacks: the punish window and the read.
        const want = 5;
        const side = e.x < b.x ? -1 : 1;
        const goal = Math.max(left, Math.min(right, b.x + side * want));
        e.vx += (Math.sign(goal - e.x) * (Math.abs(goal - e.x) > 0.5 ? 4 : 0) - e.vx) * Math.min(1, DT * 5);
        face();
        if (e.t > 1.1 - Math.min(0.4, (this.year - 1) * 0.15)) {
          e.moves++;
          const move = e.moves % 4 === 0 ? "howl" : dist > 6.5 || b.y > e.y + 1.5 ? "pounce" : "lunge";
          e.move = move;
          e.state = "tell";
          e.t = 0;
          e.target = { x: b.x, y: b.y };
          face();
          this.emit("guardian.tell", { move, x: e.x, y: e.y });
        }
        break;
      }
      case "tell": {
        e.vx *= 0.85;
        if (e.t >= TELL[e.move!]!) {
          e.state = "attack";
          e.t = 0;
          if (e.move === "lunge") e.vx = e.facing * 12;
          else if (e.move === "pounce") {
            const air = 0.9;
            e.vy = 13;
            e.vx = Math.max(-11, Math.min(11, (b.x - e.x) / air));
            e.grounded = false;
          } else {
            this.emit("guardian.howl", { x: e.x, y: e.y });
            this.dampZones.push({ x0: f.x0 + 1, x1: f.x0 + 7, y0: e.home.y - 3, y1: e.home.y + 8, t: 7 });
            this.dampZones.push({ x0: f.x1 - 7, x1: f.x1 - 1, y0: e.home.y - 3, y1: e.home.y + 8, t: 7 });
          }
          this.emit("guardian.attack", { move: e.move, x: e.x, y: e.y });
        }
        break;
      }
      case "attack": {
        if (e.move === "lunge") {
          if (e.t > 0.45 || e.x < left - 1 || e.x > right + 1) {
            e.state = "recover";
            e.t = 0;
          }
        } else if (e.move === "pounce") {
          if (e.grounded && e.t > 0.15) {
            e.state = "recover";
            e.t = 0;
            e.vx = 0;
            this.emit("guardian.land", { x: e.x, y: e.y });
          }
        } else if (e.t > 0.8) {
          e.state = "recover";
          e.t = 0;
        }
        break;
      }
      case "recover":
        e.vx *= 0.88;
        if (e.t > 0.7) {
          e.state = "circle";
          e.t = 0;
        }
        break;
      default:
        e.state = "circle";
        e.t = 0;
    }
    walk(this.world, e, DT, false);
    e.x = Math.max(f.x0 + 1.5, Math.min(f.x1 - 1.5, e.x));
  }

  // ---------------------------------------------------------------- views for presentation and tests

  score(): number {
    return this.stats.yearsDone * 1000 + this.stats.tiersGrown * 150 + this.stats.tallest * 250 - this.stats.creasesLost * 50;
  }

  describeBest(): string {
    const best = this.pack.best();
    return best ? itemName(best) : "nothing";
  }

  /** Debug: give Folio items (?pack=blade:2,hook:1). */
  givePack(spec: string): void {
    const map: Record<string, ItemId> = { blade: "ks.blade", shield: "ks.shield", hook: "ks.hook", lantern: "ks.lantern", nail: "scrap.nail", cup: "scrap.cup" };
    this.pack.slots = [null, null, null];
    spec.split(",").slice(0, 3).forEach((part) => {
      const [name, tier] = part.split(":");
      const id = map[name ?? ""];
      if (id) this.pack.add({ id, tier: isKeepsake(id) ? Math.max(1, Math.min(4, Number(tier) || 1)) : 0 });
    });
    this.pack.settleSelection();
    this.pickups = this.pickups.filter((p) => !(isKeepsake(p.item.id) && this.pack.has(p.item.id)));
  }

  /** Debug: place Folio at the start of a room (0 = Hearth). */
  warp(roomIndex: number): void {
    const r = this.world.rooms[Math.max(0, Math.min(this.world.rooms.length - 1, roomIndex))]!;
    const b = this.body;
    b.x = r.x0 + 1.5;
    b.y = groundAt(this.world, b.x, r.top + 1, r.bottom) ?? r.top;
    b.vx = b.vy = 0;
    b.grounded = false;
  }

  keepsakeName(id: string, tier: number): string {
    return isKeepsake(id as ItemId) ? KEEPSAKES[id as keyof typeof KEEPSAKES].names[tier - 1] ?? id : id;
  }
}

const STOCK_MULT_KIND: Record<string, keyof typeof STOCK_MULT> = {
  mite: "tissue", rook: "card", jay: "tissue", moth: "tissue", wolfling: "plain", mudling: "wax", hornet: "tissue",
};
