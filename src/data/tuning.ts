// Every gameplay number lives here (GDD §31). The game, tests and the climb check read the same file.
// Units: tiles (1 tile ≈ Folio's height) and seconds. Values are provisional unless marked LOCKED.

export const TUNE = {
  tickRate: 120, // LOCKED
  // Body
  width: 0.6,
  height: 0.9,
  flatHeight: 0.25,
  flatWidth: 0.9,
  // Run
  runSpeed: 6.0,
  dampRunSpeed: 4.2,
  groundAccel: 60,
  friction: 55,
  airAccel: 40,
  // Jump
  gravity: 30,
  terminal: 16,
  jump: 11.5,
  dampJump: 9.5,
  jumpCut: 0.5,
  apexHang: 0.75, // gravity scale near the apex while jump is held: a paper float
  apexBand: 2.0,
  coyote: 0.1,
  buffer: 0.12,
  // Dart (hold jump while falling)
  dartFallCap: 2.2,
  dartForward: 7.0,
  // Flatten (slide on flat ground)
  flattenTime: 0.35,
  flattenIFrames: [0.08, 0.25] as const,
  flattenSpeed: 8.6,
  flattenCooldown: 0.4,
  crawlSpeed: 2.4, // stuck flat under a low ceiling
  // Crumple (slide on a slope)
  crumpleAccel: 26,
  crumpleMax: 13,
  crumpleBounceHp: 2,
  // Health
  creases: 5,
  afterHitInvuln: 1.0,
  hitstun: 0.25,
  knockback: 4,
  // Damp (0..1)
  dampGainSnow: 0.25,
  dampGainDust: 0.5,
  dampDryHeat: 0.33,
  dampDryAir: 0.06, // assumption (DECISIONS.md): paper dries slowly in the open outside winter
  dampDryAirWinter: 0.02,
  heatRadius: 3.5,
  // Burial
  buryHold: 0.5,
  buryStand: 0.3,
  autumnBonus: 1, // LOCKED
  winterBonus: 2,
  tierCap: 4, // LOCKED
  slots: 3, // LOCKED
  // Landmarks: height in tiles by tier (T2 ledge, T3 tower, T4 mythic)
  landmarkHeight: [0, 1, 3, 6, 10] as const,
  ledgeStep: 1.75,
  // Combat
  hitstopBase: 0.03,
  hitstopTier: 0.01,
  hitstopHeavy: 0.03,
  hitstopCap: 0.12,
  stompDamage: 1,
  stompBounce: 9,
  crumpleDamage: 2,
  // Guardian
  wolfHp: [0, 30, 45, 60] as const, // per year; Phase 0 reuses the Drift Wolf for all three years
  // Pacing
  maxActiveInView: 6, // LOCKED
  spawnMinDistance: 6, // LOCKED
  // The turn
  turnFirst: 6,
  turnLater: 2.5,
  years: 3,
} as const;

/** Verb numbers per keepsake family, T1 baseline (tuning §4). */
export const VERB = {
  blade: { startup: 0.06, active: 0.08, recovery: 0.12, chain: 3, damage: 1, reach: 1.25, perTierDamage: 0.6, perTierReach: 0.15 },
  shield: { parry: 0.12, parryPerTier: 0.03, missRecovery: 0.2, stagger: 0.8, riposte: 1, blockSpeed: 0.45 },
  hook: { range: 6, rangePerTier: 2, startup: 0.05, cooldown: 0.3, pull: 22, damage: 1 },
  lantern: { startup: 0.1, active: 0.4, recovery: 0.1, cooldown: 2, radius: 2.6, revealRadius: 6, revealPerTier: 3, damage: 1.5, dry: 0.5 },
} as const;

export const tierDamage = (base: number, tier: number, perTier: number) => base * (1 + perTier * (tier - 1));
export const hitstop = (tier: number, heavy: boolean) =>
  Math.min(TUNE.hitstopCap, TUNE.hitstopBase + TUNE.hitstopTier * tier + (heavy ? TUNE.hitstopHeavy : 0));
