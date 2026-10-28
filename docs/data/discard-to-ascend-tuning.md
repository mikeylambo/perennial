# Discard to Ascend / Perennial: Tuning Model and Climb Bot

First-pass numbers for the builder. All gameplay values live in one data file so the game, the climb bot and the balance sim read the same numbers. Units: tiles (1 tile ≈ Folio's height) and seconds. Everything here is *(default)* until playtested.

## 1. Folio's movement

| Value | Default | Notes |
|---|---|---|
| Size | 0.6 × 1.0 | Flattened: 1.0 × 0.25 |
| Run speed | 6.0 | Damp: 4.2 |
| Ground accel / friction | 60 / 55 | Light, quick |
| Air accel | 40 | |
| Gravity | 30 | Lighter than Preserve's 38: paper floats. Terminal fall 16 |
| Jump velocity | 11.5 | ≈ 2.2 tiles high. Damp: 9.5 (≈ 1.5 tiles) |
| Jump cut | × 0.5 on early release | |
| Coyote / buffer | 0.1 / 0.12 | |
| Flatten | 0.35 s; invulnerable 0.08–0.25 s; cooldown 0.4 s | Slides 3 tiles |
| Dart glide | Fall speed capped at 2.2; forward 7.0; lasts until landing | Wind updraft: +12 up. Disabled while damp |
| Crumple | Only on slopes ≥ 15°; accelerates to 13; bounces enemies under 2 HP | Can't jump while crumpled; exits on flat ground |
| Damp | 4 s in snow/water to full; dries in 3 s near heat, 8 s in sun patches | |

## 2. Health and damage

| Value | Default |
|---|---|
| Creases (HP) | 5 |
| Normal hit | 1 crease |
| Fire on paper | 2 creases |
| Fall damage | None (paper); landing in water: damp |
| Hit invulnerability | 1.0 s |
| Hearth | Mends all creases |

## 3. Growth (`SeasonPlots`)

| Rule | Default |
|---|---|
| Autumn plot | +1 tier |
| Winter plot | +2 tiers |
| Cap | T4; overflow becomes a +1 seed for the next burial |
| Scrap | Rots to a 1-tile stump |
| Plot sockets per room | Autumn 3, winter 2 (one hard to reach); each on a different spring route |
| Letter lines | 1 per completed year; 12 total |
| Landmark size classes | T2 ledge: 2–3 tiles up · T3 tower: 5–7 tiles · T4 mythic: 9–12 tiles plus a room effect |
| Harvests per year | Unlimited (pack limits it) |
| Rise animation | 0.4 s stagger per piece; full rise ≤ 2.5 s (look test used about 2.2 s) |

**Expected tier curve per run:** a player who buries one good keepsake in winter each year should be carrying one T3 by Year 2 and one T4 by Year 3. The balance sim (section 6) checks this.

## 4. Verbs (T1 → T4 multipliers)

| Family | T1 baseline | Per tier |
|---|---|---|
| Strike | Ember Blade: 1 damage per hit, 3-hit combo in 0.6 s | +60% damage, +15% reach |
| Guard | Shield block 100% frontal; parry window 0.12 s | Parry window +0.03 s; T3+ parry reflects |
| Move | Hook range 6 tiles | +2 tiles; T3+ chains two hooks |
| Tend | Lantern reveal radius 6; needle 3 charges | +3 radius; +1 charge |

**Pairs:** detection window 80 ms; pair tier = lower of the two; pair moves cost no resource but share the longer recovery of their two verbs. **Hit feel:** hitstop 40 ms (light) to 70 ms (heavy, parry); Folio knockback 4 tiles horizontal, enemies 2–6 by stock (tissue farthest); attack recovery never locks movement over 0.25 s.

T4 forms each add one signature trait (listed in content as the T4 name; trait text in the item data).

## 5. Enemies and guardians

| Class | HP (T1 blade hits) | Notes |
|---|---|---|
| Small (Leaf Mite, Mudling) | 1 | Crumple kills |
| Medium (Fox Paper, Snow Hare) | 3 | |
| Armored (Bark Beetle, Rime Crab) | 4 + armor | Hammer or fire breaks armor |
| Elite | 18 | |
| Drift Wolf | 30 | Year 1 |
| Icefall Stag / peak guardian Y2 | 55 | |
| Long Night / peak guardian Y3 | 80 | |
| Magpie King | 110 (two phases) | Steals one pack item every 9 s in phase 1 |

**Guardian design target:** with a full T1/T2 pack, about 90 s for a skilled player; bare, about 3 min and very risky. The fight must stay winnable bare (bot check: a scripted bare-move strategy can win at Hard Winters 0).

## 6. Balance sim (CI)

A headless sim plays 10,000 seeded runs with scripted policies:
- **Hoarder:** never buries keepsakes, only scrap.
- **Sower:** buries the best keepsake in winter each year.
- **Reckless:** buries everything.

**Targets:** Sower wins most often and reaches T4 by Year 3 in ≥ 60% of runs. Hoarder wins guardians more easily but fails more climbs (time and crease loss) and loses the Magpie fight more. Reckless wins the climbs and loses Year 1 guardians often. If Hoarder beats Sower overall, growth is too weak; if Reckless beats Sower, guardians are too soft.

## 7. Climb bot (CI)

- Every spring room is cleared by a bot using only bare moves (zero landmarks) within 3× the landmark route's par time.
- Every landmark socket at every tier is reachable and its top bloom is collectable.
- Every descent room is clearable with any three keepsakes and with an empty pack.

## 8. Telemetry for tuning *(default, opt-in)*

Per run: which keepsakes were buried, where (band), at what tier, guardian clear time per pack size, crease loss per room, bare-route vs landmark-route use on the climb, harvest choices, ending choice. The key metric is **burial rate of the best keepsake in the pack**: if it's under 25%, the spring isn't paying enough; over 70%, the guardian isn't asking enough.
