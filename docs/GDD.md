# PERENNIAL
## Game Design & Build Handoff Document

**Version:** 0.1
**Status:** Preproduction → Production-Ready on sign-off of §43 and §46
**Last Updated:** 2026-10-27
**Primary Platform:** Web (itch.io, portals), then Steam + iOS/Android together through the shared native wrapper
**Engine / Stack:** TypeScript + Vite, Three.js (via the Shell's `ThreeAdapter`), SLU Web Shell
✚ **Base Repo:** Shell-generated (`perennial`, Mike creating on GitHub; see §29.2)
✚ **Universe:** Standalone (Card Concepts project: concept #14 "Discard to Ascend"; mechanic and essence only, original names and art)
✚ **Pipeline Triage Score:** TBD / 30 (`TRIAGE.md` is not available in this environment; score it at repo creation)

**Purpose:** This document is the source of truth for the game's intended player experience, systems, content, presentation, and completion criteria.

If implementation details conflict with the intended player experience, preserve the player experience unless a documented technical constraint prevents it.

**Companion data (detail tables this GDD points to):** `discard-to-ascend.md` (original spec), `discard-to-ascend-content.md` (keepsakes, pairs, stocks, enemies, guardians, letter), `discard-to-ascend-tuning.md`, `discard-to-ascend-onboarding.md`, `discard-to-ascend-art-bible.md`, `discard-to-ascend-production.md` (Shell fit, cue sheet, flows, save). Look test: https://claude.ai/artifact/Qd5QectGotx8MTKEPT4fz1. Where this GDD and a companion disagree, **this GDD wins**.

---

## 0. Executive Summary

### One-Sentence Pitch
> A side-view paper-cut action roguelite where a folded paper wanderer **buries its best gear** on the way down a mountain into winter, faces a guardian with whatever it kept, then **climbs back up through what grew**, distinguished by a return path built entirely from what you gave up.

### Player Fantasy
The player should feel like **a small, brave sower**: someone who gives up the thing that keeps them safe, survives the winter on faith, and comes back to find the world built tall out of their own generosity.

### Core Experience
The game is fundamentally about:
1. **Letting go under pressure:** choosing what to bury when keeping it would make the next fight easier.
2. **Reaping what you sowed:** climbing landmarks grown from your burials and taking back evolved gear.
3. **Compounding faith:** replanting harvests across three years so the run's power comes from earlier generosity.

The player should spend most of their time: **moving and fighting through paper slopes with a three-verb kit, while reading each room for where to plant.**

### ✚ The Bet
> *Does burying your best keepsake before a guardian feel like a real sacrifice, and does climbing what it grew into feel like the payoff, unlike anything else?*

Phase 0 (§40) exists to answer this and nothing more.

### ✚ Competitive Position
| | Closest existing game | How we differ |
|---|---|---|
| Verb | Dead Cells / Hollow Knight (side-view weapon combat) | Your kit is three keepsakes, and **giving one up is the main strategic act**; pair moves make each loss cost twice |
| Payoff | Rogue Legacy (meta growth between runs) | Growth happens **inside the run, in the level itself**: buried gear becomes the terrain you climb and returns evolved |
| Space / structure | Spelunky (shuffled authored rooms); Seasons After Fall (season states) | Each room is played twice, **down in autumn/winter and up in spring**, and the spring version is shaped by your burials |

### Target Experience
- **Session length:** ~40 min per full run (three years × ~14 min); a year is a natural stopping point (~14 min)
- **Players:** 1
- **Perspective:** 2.5D side-view (perspective camera, layered planes)
- **Genre:** action roguelite with traversal focus
- **Audience:** midcore players of Hollow Knight, Dead Cells, Celeste, Spiritfarer; drawn by the paper look and the meaning
- **Complexity:** midcore (simple rules, deep compounding)
- **Primary input:** controller and keyboard equally; touch is first-class (landscape)

---

## 1. Design Pillars

### Pillar 1 — Giving Is the Strategy
- **Meaning:** The strongest play is generosity at the right moment. Burying is not a menu action; it's the game's central decision.
- **Player consequence:** Every plot asks "now or later?" Players feel the loss in their hands and the reward in the climb.
- **Reject features that:** let players keep everything (storage, stashes that preserve gear across the guardian), buy power with a currency, or make burying free of short-term cost.

### Pillar 2 — The World Remembers
- **Meaning:** What you did on the way down is visible, physical and climbable on the way up. Nothing is abstracted into a stat screen.
- **Player consequence:** Players read the spring room and see their own choices standing in it.
- **Reject features that:** grant growth as invisible bonuses, auto-place landmarks, or reset rooms between descent and climb.

### Pillar 3 — Everything Is Paper
- **Meaning:** Hero, world, enemies, UI and VFX are made of paper and behave like it: light, foldable, flammable, soakable.
- **Player consequence:** Paper physics are mechanics (dart glide, flatten, crumple, damp, fire), and the look is coherent.
- **Reject features that:** add effects paper couldn't make (neon glow, chrome, painted gradients), or mechanics that ignore paper rules.

### Pillar 4 — Quiet Clarity
- **Meaning:** Wordless storytelling, minimal UI, readable threats. The letter is the only text with weight.
- **Player consequence:** Players understand through shape, motion and sound; the screen stays calm.
- **Reject features that:** add popups, damage numbers, lore text, tutorials in text boxes, or HUD beyond the budget (§21).

### ✚ Design Laws
1. **Burying always costs something now.** If a burial has no short-term cost, it's a bug.
2. **Every climb is finishable bare.** No burial pattern can soft-lock a room (climb bot, CI).
3. **The spring shows the autumn.** Every landmark is identifiable as its keepsake at gameplay camera distance.
4. **Every threat is telegraphed by shape and motion first.** Color only supports.
5. **No currency, ever.** The economy is the pack, the plots and time.
6. **Verified, not reported.** A feature exists when it's proven in a running build.

---

## 2. Anti-Pillars
The game should not become:
- **A hoarding game:** stashes, banks, storage or insurance that let you keep gear through the guardian.
- **A grind:** meta stats that make early peaks trivial; progression is options and story, not damage numbers.
- **A builder sim:** free placement, crafting or construction menus. You plant; the world grows.
- **Animation-locked:** no attack locks movement longer than 0.25 s.
- **Text-heavy:** no item descriptions in runs beyond names and tier pips; no lore popups.
- **Unreadable paper soup:** gameplay planes always out-contrast the backdrop.
- **A puzzle game wearing a roguelite coat:** rooms are fought and moved through, not solved once.

---

## 3. Reference DNA

| Reference | Take | Do Not Take |
|---|---|---|
| Hollow Knight | Tight, readable combat; pogo; parry; generous i-frames; enemy tells | Its dark gothic palette, its long backtracking map |
| Dead Cells | Run pacing, weapon variety, room-shuffled authored biomes | Its numbers-heavy loot and its cell currency |
| Celeste | Movement precision, coyote and buffer, assist philosophy | Its single-screen puzzle structure |
| Tearaway / Paper Mario: Origami King / Lumino City | Real paper materiality, folds and pop-ups, light through paper | Papercraft as gimmick on top of an ordinary game |
| Spelunky | Authored room chunks recombined per seed | Its brutal one-hit deaths |
| Seasons After Fall | One space in several season states | Seasons as a switch tool |
| Rogue Legacy | A home that grows between runs | Stat-grind meta upgrades |
| Spiritfarer | Gentle, meaningful tone about letting go | Its management load |

### Reference Weighting
- Hollow Knight (combat feel): 25%
- Dead Cells (run structure): 20%
- Tearaway / Lumino City (material and look): 20%
- Original direction (burial, spring climb, compounding, letter): 35%

### ✚ Calibration Data
Target the **feel**, not exact values.
- **Movement:** Preserve's protected platformer feel is the starting point (gravity 38, jump velocity 13, coyote 0.09 s, buffer 0.12 s); Perennial is deliberately **lighter** (gravity 30, jump 11.5) because Folio is paper.
- **Combat:** Hollow Knight's nail is roughly a 0.25–0.35 s swing cycle with a short hitstop. We target a T1 blade 3-hit chain in 0.6 s, hitstop 40 ms light / 70 ms heavy.
- **Run length:** Dead Cells' full run is ~45–60 min; ours is ~40 min with a natural break every ~14 min (Hearth).

---

## 4. Core Loop

### Moment-to-Moment Loop (5–30 s)
Read the room → **move** (run, crumple, dart) → **fight** with three verbs and pairs → spot a plot → **decide** (bury now, keep, or swap a find) → carry on lighter or stronger → next room.

On the climb: read the spring room → choose bare route or landmark route → climb your landmark → **harvest** the bloom → fight spring threats → next room.

### Year Loop (one face, ~14 min)
1. Descend the autumn band (4 rooms): find keepsakes, bury in 1 of 2–3 sockets per room.
2. Descend the winter band (3 rooms): two-tier plots near the guardian; damp and cold.
3. Fight the **guardian** with what you kept.
4. **The turn:** spring arrives; every plot pops up as a landmark.
5. Climb thaw and bloom bands through your landmarks; harvest evolved keepsakes.
6. **Hearth:** mend, reorder, pick a seed-charm, read a new line of the letter.

### Session Loop
Fallow → choose peak → run three years → summit and ending, or tear → results → the Fallow greens a little → new keepsakes/peaks/letter lines → climb again. A player starts another run because the letter isn't finished, the Herbarium has gaps, and they want to try a braver burial.

### Long-Term Loop
Play → Fallow greens (unlocks keepsakes, folds, peaks) → letter lines reveal → harder peaks and Hard Winters → Write back ending → Endless Years and Daily Mountain for mastery.

### ✚ Fiction ↔ Mechanics Map
| Mechanic / Mode | Fiction meaning |
|---|---|
| Creases = health | Folio is a letter; every hit wrinkles it; torn = lost |
| Dart / flatten / crumple | Folio folds itself into other shapes |
| Damp, fire | Paper's real enemies |
| Burying | Sowing: giving something to the ground so it can grow |
| Winter plots grow two tiers | The harder the winter, the bigger the spring |
| Landmarks | What you sowed grew into the world |
| Harvest | The ground gives back more than you gave |
| Replanting across years | Perennial: it comes back every year, stronger |
| Guardian | Winter testing what you held onto |
| Magpie King | The hoarder: the opposite of the sower |
| The Fallow greening | Long-term restoration of a valley someone failed to plant |
| The letter | The last gardener's regret and hope, written to whoever plants next (you) |
| Write back | You become the next letter |

---

## 5. Player Goals

### Immediate Goals
- Get through this room without losing creases.
- Decide whether to bury what I'm holding, and in which socket.
- Reach the bloom at the top of my landmark.

### Run Goal
Survive three years on the peak, beat the Magpie King at the summit, and choose an ending.

### Secondary Goals
- Grow a T4 keepsake.
- Finish a year without using the bare route.
- Find every stash on a face.

### Long-Term Goals
- Read the whole letter and see Write back.
- Green the entire Fallow.
- Fill the Herbarium; clear Hard Winters 15 on every peak.

---

## 6. Game Rules

- **Win (run):** defeat the Magpie King at the summit at the end of Year 3, then choose an ending (Harvest, Sow the summit, or Write back once unlocked).
- **Loss:** Folio reaches 0 creases (torn). The run ends; plots and carried keepsakes are lost; years completed still green the Fallow and reveal letter lines.
- **Draw / Reset:** none. Abandoning a run counts as a loss but still credits completed years.

### Scoring (results screen and Daily/Endless boards)
| Action | Result |
|---|---|
| Year completed | +1000 |
| Keepsake tier grown (per tier gained, summed) | +150 |
| Tallest landmark tier this run | +250 × tier |
| Crease lost | −50 |
| Run time | Tiebreaker only |
| Summit reached | +3000 |

Letter grade from the Shell `RankingSystem` (D to S). Endless Years scores by years survived, then the sum above.

### Important Exceptions
- Burying scrap gives no harvest; it rots into a stump (1-tile foothold).
- Growth caps at T4; overflow becomes a +1 seed for the next burial.
- Stolen items return if the thief dies before the guardian falls; otherwise they're gone for the year.
- Every spring room is clearable with zero landmarks.

✚ **Rule budget:** a new player holds **four rules**: *three slots, each is a move*; *bury to grow*; *winter grows more*; *climb what grew and take it back.* Everything else is discoverable. If onboarding needs a fifth rule, a pillar is at risk.

---

## 7. Player Verbs

| Verb | Input (pad / KBM / touch) | Function | Commitment | Major Interaction |
|---|---|---|---|---|
| Move | Stick / A-D / left pad | Navigate | Low | Slopes start crumple |
| Jump | A / Space / jump btn | Variable-height jump | Low | Coyote 0.1 s, buffer 0.12 s |
| Dart | Hold A in air / hold Space / hold jump | Glide | Low (cancel any time) | Wind lifts; damp disables |
| Flatten | B / Shift / slide btn (on flat) | Slide under, dodge | Medium (0.35 s) | I-frames 0.08–0.25 s; dodges high attacks |
| Crumple | B on slope / Shift on slope | Roll downhill | Medium (until flat) | Bounces small enemies; no jump while rolling |
| Verb 1–3 | X, Y, RB / J, K, L / verb arc | Use the keepsake in that slot | Per keepsake (§11) | Each keepsake is one verb |
| Pair | Two verb buttons within 80 ms / slide thumb across two | Family pair move | Higher | Lower tier of the two |
| Bury | Hold LB / hold E / contextual btn (0.5 s hold) | Plant a carried item in a plot | High (vulnerable while holding) | Chooses which landmark rises where |
| Harvest | Interact at a bloom | Take an evolved keepsake | Low | Swap if pack full |
| Pick up / swap / drop | Interact / pack.swap | Manage the 3 slots | Low | Drops stay for the year |
| Dig | Hold bury on soft ground | Dig up stashes | Medium | Lantern/compass reveal stashes |

Every mechanic maps to one of these or to the bury decision.

---

## 8. Controls

### Gamepad
| Input | Context | Action |
|---|---|---|
| Left stick / D-pad | Run | Move; down + B = flatten |
| A | Run | Jump; hold in air = dart |
| B | Run | Slide (flatten on flat, crumple on slope) |
| X / Y / RB | Run | Verb 1 / 2 / 3; any two together = pair |
| LB (hold) | On a plot | Bury selected slot (D-pad left/right picks slot while holding) |
| LB (hold) | Soft ground | Dig |
| Right stick click / Select | Run | Pack inspect |
| Start | Any | Pause |
| A / B | Menus | Confirm / back |

### Keyboard / Mouse
| Input | Context | Action |
|---|---|---|
| A/D or ←/→, S/↓ | Run | Move; down + Shift = flatten |
| Space (hold) | Run | Jump / dart |
| Shift | Run | Slide |
| J / K / L | Run | Verb 1 / 2 / 3; any two together = pair |
| E (hold) | Plot / soft ground | Bury / dig (1/2/3 while holding picks the slot) |
| Tab | Run | Pack inspect |
| Esc | Any | Pause |
| Mouse | Menus only | Point and click; gameplay never needs the mouse |

### Touch (landscape)
| Input | Context | Action |
|---|---|---|
| Left-thumb floating pad | Run | Move; flick down = flatten |
| Right-thumb jump (bottom) | Run | Tap jump, hold dart |
| Right-thumb slide (left of jump) | Run | Slide |
| Verb arc (three keepsake-silhouette buttons above jump) | Run | Tap = verb; slide across two = pair |
| Contextual Bury (appears above the verb arc on a plot) | Plot | Hold to bury; the arc highlights the selected slot |
| Top-right corner | Any | Pause |

**Hand split:** left hand moves, right hand acts. Bury is deliberately on the left shoulder / left key cluster, away from attack buttons, so it is never pressed by accident in a fight.

### Input Philosophy
- **Buffering:** jump 0.12 s (15 ticks @120 Hz); verbs 0.1 s; slide 0.08 s.
- **Simultaneous inputs:** two verb presses within 80 ms = pair; otherwise the first verb fires and the second buffers.
- **Held inputs:** jump hold = dart; bury/dig are 0.5 s holds with a visible fill ring, cancelable by release or taking a hit.
- **Repeated inputs:** strike combos chain on presses inside the recovery window; mashing never skips recovery.
- **Remapping:** every gameplay action is remappable on all devices; touch layout editor in settings.
- **Analog thresholds:** stick dead zone 0.2; run at full speed above 0.5; down-for-flatten below −0.6.
- **Controller disconnect:** auto-pause; resume on reconnect or any input from another device.
- **Input during transitions:** 0.25 s guard on opening any menu so a gameplay press can't confirm it; the turn cutscene ignores verb inputs.
- **Pause:** freezes the simulation entirely, including the bury hold.

---

## 9. Movement Specification

### Base Movement (tiles, seconds; 1 tile ≈ Folio's height; fixed tick 120 Hz)
- **Top speed:** 6.0 tiles/s (damp: 4.2)
- **Acceleration:** 60 tiles/s² ground, 40 air
- **Deceleration:** 55 tiles/s² (ground friction)
- **Turn behavior:** instant facing flip; velocity reverses through deceleration
- **Air control:** 40 tiles/s², full steering
- **Momentum:** crumple carries momentum up to 13 tiles/s and exits into a run at current speed

### Movement Feel
- **Movement should feel:** light, quick and floaty at the top of jumps, like paper caught by air; precise on landing.
- **Movement should not feel:** heavy, slippery on flat ground, or icy (except on ice tiles).

### Key Behaviors
- **Starting:** reaches top speed in 0.1 s.
- **Stopping:** stops in ~0.11 s; a tiny paper skid.
- **Reversing:** under 0.2 s to full speed the other way.
- **Running into obstacles:** stops dead; no bounce.
- **Slopes:** run speed unchanged up to 45°; slide on a slope ≥15° becomes crumple.
- **Ledges:** coyote 0.1 s; no auto-grab (crampons add wall cling).
- **Falling:** gravity 30, terminal 16; no fall damage (paper); landing in water = damp.
- **Airborne:** jump 11.5 tiles/s (~2.2 tiles high); jump cut ×0.5 on release; dart caps fall at 2.2 and forward 7.0.
- **Collision with characters:** enemies push Folio on contact damage only; no body blocking between Folio and small enemies.

---

## 10. Game Feel Bible

### Jump / Dart
- **Fantasy:** a sheet of paper flicked into the air and caught by a breeze.
- **Startup:** instant; a quick fold-crouch frame.
- **Active moment:** a soft float at the apex; holding folds Folio into a dart with a whip of air.
- **Impact:** a soft paper pat on landing; tiny dust or leaf puff.
- **Recovery:** none; land and go.
- **Success should feel:** effortless, airy.
- **Failure should feel:** fair: you saw the gap.
- **Must never feel:** floaty in a way that makes landings imprecise.

### Flatten (dodge)
- **Fantasy:** folding flat to slip under a blow.
- **Startup:** 1 tick; a crisp fold sound.
- **Active moment:** 0.35 s slide, i-frames 0.08–0.25 s.
- **Impact:** a whoosh as an attack passes over; perfect dodges (attack inside the i-frames) get a white paper-edge glint.
- **Recovery:** 0.1 s unfold.
- **Must never feel:** sticky or like a roll that can't be steered.

### Crumple
- **Fantasy:** balling up and bowling downhill.
- **Startup:** 0.08 s scrunch.
- **Active moment:** accelerating roll, crinkle loop rising in pitch.
- **Impact:** small enemies pop off with a rustle; larger ones stop the roll and bounce Folio back.
- **Recovery:** unrolls on flat ground into a run.
- **Must never feel:** uncontrollable; steering still slows and speeds.

### Strike (T1 Ember Blade)
- **Fantasy:** a quick paper blade slicing other paper.
- **Startup:** 0.06 s.
- **Active:** 0.08 s per swing; 3-hit chain in 0.6 s; third hit knocks back.
- **Impact:** 40 ms hitstop, a tear-white flash on the target edge, scraps flying, slice sound by stock.
- **Recovery:** 0.12 s; can jump- or slide-cancel after the active frames.
- **Success should feel:** crisp, tearing.
- **Must never feel:** sluggish or lock movement over 0.25 s.

### Parry (Bramble Shield)
- **Fantasy:** catching a blow on a thorned board.
- **Startup:** 0 (block); parry window 0.12 s from press (+0.03 s per tier).
- **Impact:** 70 ms hitstop, a thorn-burst ring, a hard wooden snap; the attacker staggers 0.8 s.
- **Recovery:** 0.2 s on a missed parry (held block continues).
- **Failure should feel:** clear: the tell was readable.

### Pair move (example: hook + blade Swoop)
- **Fantasy:** two treasures working as one.
- **Startup:** 0.1 s, both keepsake icons flash on Folio's back.
- **Active:** the longer of the two verbs.
- **Impact:** one tier up the impact scale (§10 table); both verbs' sounds layered with a fold snap.

### Bury
- **Fantasy:** a solemn act of letting go.
- **Startup:** 0.5 s hold; Folio kneels; a fill ring around the plot; music ducks 3 dB.
- **Active moment:** the keepsake lowers into the ground; soil folds over; a low bell.
- **Impact:** the slot empties visibly on Folio's back and on the HUD tab.
- **Recovery:** 0.3 s to stand.
- **Must never feel:** like discarding junk from a menu. It's the game's most important gesture.

### Landmark rise (the turn and harvest)
- **Fantasy:** what you gave coming back taller than you.
- **Active:** pieces unfold base to crown, 0.4 s stagger, ≤2.5 s total; a pluck per piece, a chord at the crown.
- **Impact:** climax tier on T4; the camera frames the landmark.
- **Harvest:** a bright bell, the bloom folds into the keepsake icon and flies to the pack.

### Taking damage
- **Fantasy:** a letter getting crumpled.
- **Impact:** 60 ms hitstop, knockback 4 tiles, a dry crack; a visible new crease line on Folio.
- **Recovery:** 1.0 s invulnerability, Folio flickers between flat and crumpled cuts.
- **Death (torn):** time slows, Folio tears along its creases; the pieces flutter down; silence, then a single pen-scratch.

### ✚ Impact Scale
> **Hitstop = 30 ms + 10 ms × attack tier, +30 ms if heavy-class (hammer, parry, pair, guardian hit), cap 120 ms. Shake only on heavy and climax, capped at 6 px. Every landed hit gets at least 30 ms and a paper-scrap burst.**

| Event tier | Hitstop | Shake | Flash | Audio | Haptic |
|---|---|---|---|---|---|
| Light (T1–T2 strike, small kill) | 30–50 ms | 0 | 1-frame tear-white edge on target | Stock-specific crinkle | Light, 30 ms |
| Heavy (hammer, parry, pair, damage taken) | 60–90 ms | 2–3 px | 2-frame paper flash + scrap burst | Layered thump/snap | Medium, 70 ms |
| Climax (guardian phase break, T4 rise, final hit) | 120 ms + 0.4 s slow-mo | 6 px | Full-screen paper-white fold flash (Reduce Flash: a soft vignette instead) | Chord + bell | Strong, 180 ms pattern |

---

## 11. Combat / Interaction Model

### Core Relationship
**Read the fold → commit a verb or dodge → punish the opening**, under the strategic layer of **what you kept**. Pairs give each pack three combos; paper stocks decide which verb works on which enemy.

### ✚ Counter Matrix
| Option | Beats | Loses to |
|---|---|---|
| Strike | Tissue, felt, enemies recovering from a whiff | Card fronts, foil (cut ×0.5), anything mid-charge |
| Blunt strike (hammer, stomp) | Card, foil, armor | Felt (×0.25), fast fliers |
| Parry | Melee lunges, single projectiles | Grabs/thefts, unblockable crushes (jagged outline), area slams |
| Flatten | High swings, charges, dives | Low sweeps, ground slams |
| Dart / jump | Low sweeps, ground slams, pits | Fliers, wind gusts, damp |
| Crumple | Downhill swarms of small enemies | Anything armored, any uphill fight |
| Fire (lantern, flint) | Wax, tissue, thorns, ice | Foil (reflected), Folio itself if too close |
| Wind (fan, bellows) | Tissue, projectiles, fliers | Card (immune), felt |
| Bury (strategic) | The climb and the future | The guardian and the present |

No option is dominant: every verb family has a stock it's weak against, and the guardian punishes empty packs.

### ✚ Tell Table
| Threat / ability | Windup (min) | Visual tell (shape / motion) | Audio tell | Counterplay |
|---|---|---|---|---|
| Melee lunge (Fox Paper, wolflings) | 0.35 s | Body creases backward along a fold line | Dry crease | Parry or flatten |
| Dive (Rook, Hornet) | 0.4 s | Wings fold tight, a short hover | Caw / buzz rise | Dodge sideways, strike on landing |
| Charge (Ice Ram, Stag) | 0.6 s | Head lowers, hooves scrape a paper line | Scrape | Flatten under or jump |
| Unblockable crush | 0.7 s | **Jagged torn outline** on the attacker | Low tearing groan | Dodge only |
| Projectile (Hedge Sprite, Sleet Wisp) | 0.3 s | Arm cocks back / body swells | Inhale | Parry, reflect (mirror), dodge |
| Theft (Acorn Jay, White Stoat, Magpie) | 0.45 s | Eye glint + forward hop | Chitter | Hit it first; catch the thief before the guardian |
| Damp dust (Frost Moth) | 0.5 s | Wings open wide, dust shimmer | Soft shake | Move out; dry later |
| Drop (Icicle Bat) | 0.4 s | Icicle cracks at the root | Crack | Keep moving under |
| Ambush (Drift Lurker) | 0.3 s | Snow bank bulges | Muffled shift | Lantern/compass reveal |
| Landmark threat (Gnaw Vole, Weed King) | Continuous | Landmark visibly shrinks/wilts | Chewing / creak | Kill it within 10 s |
| Guardian phase attacks | ≥0.5 s each | See content §5; each guardian gets one unique fold tell per attack | Unique per attack | Per attack |

✚ **Threat focus rule:** only enemies targeting Folio show full tells; others dim 15% and desaturate slightly. Off-screen threats get an edge marker shaped like their silhouette. Max 6 active enemies in view (pacing, §19).

### States
| State | Can Move | Can Act | Vulnerable | Exit |
|---|---|---|---|---|
| Idle / Run | Yes | Yes | Yes | Input |
| Airborne | Air control | Yes | Yes | Land |
| Dart | Steer | Verbs cancel dart | Yes | Release, land, damp |
| Flatten | Slide only | No | I-frames 0.08–0.25 s | 0.35 s |
| Crumple | Steer | No | Yes (rolls through smalls) | Flat ground / slide again |
| Verb startup / active | Limited (strike: yes) | No | Yes | Timing |
| Verb recovery | Yes after 0.12 s | Chain / cancel into jump or slide | Yes | Timing |
| Bury / dig hold | No | No | **Yes** | Release, complete, hit |
| Hitstun | No | No | Invulnerable 1.0 s after the hit | 0.25 s |
| Damp | Slower | Yes, no dart | Yes | Dry |
| Torn | — | — | — | Run ends |

### Timing (T1; tiers per tuning §4)
| Action | Startup | Active | Recovery | Cooldown |
|---|---|---|---|---|
| Blade (each of 3) | 0.06 s | 0.08 s | 0.12 s | — |
| Spear thrust / pogo | 0.08 s | 0.1 s | 0.15 s | — |
| Hammer | 0.25 s | 0.1 s | 0.3 s | — |
| Sling | 0.1 s | projectile | 0.15 s | 0.4 s |
| Shield block / parry | 0 | parry 0.12 s | 0.2 s on miss | — |
| Cloak phase | 0.03 s | 0.3 s | 0.15 s | 1.2 s |
| Hook throw | 0.05 s | to 6 tiles | — | 0.3 s |
| Lantern flare | 0.1 s | 0.4 s | 0.1 s | 2 s |
| Bell ring | 0.15 s | 0.2 s | 0.2 s | 6 s |
| Needle stitch | 0.5 s | — | — | 3 charges / year |
| Pair moves | 0.1 s | longer of the two | longer of the two | longer of the two |

### Hit Resolution
- **Detection:** authoritative hitboxes in the sim (AABB and capsules on the tile grid); never from rendered geometry.
- **Hurtboxes:** Folio's hurtbox shrinks to 1.0 × 0.25 when flattened.
- **Priority / clashes:** if Folio's strike and an enemy melee land the same tick, both bounce back 1 tile with a clash spark; no damage.
- **Invulnerability:** after-hit 1.0 s; flatten 0.08–0.25 s; cloak phase active.
- **Armor:** card fronts and Rime Knight; broken by blunt or fire (stock table).
- **Interruptions:** any hit interrupts bury/dig; enemy windups are interrupted by stagger (parry, heavy hits).
- **Multi-hit:** each hitbox hits a target once per activation.
- **Knockback:** Folio 4 tiles; enemies 2–6 tiles by stock (tissue farthest, felt least).
- **Hitstun:** Folio 0.25 s; enemies 0.2–0.5 s by class.
- **Death:** enemies fold up and blow away; guardians tear apart at the end of their last phase.

---

## 12. Resources

### Creases (health)
- **Range:** 0–5 (assist: 7)
- **Generated by:** —
- **Lost by:** hits (1), fire (2), unblockable crush (2)
- **Regeneration:** full at Hearth; Needle stitch +1 (3 charges/year); Thorn hedge berries +1 once/year; Orchard fruit +1; Loom tree full once
- **Purpose:** risk that makes bare play dangerous and the guardian a real test.

### Pack slots
- **Range:** 3 (Hollow Pack charm: 4th slot, scrap only)
- **Spent on:** keepsakes and scrap
- **Lost by:** bury, drop, theft
- **Purpose:** the whole kit; the scarcity that makes burial hurt.

### Plot sockets
- **Range:** autumn rooms 3, winter rooms 2 (one hard to reach)
- **Spent on:** one burial each
- **Purpose:** where you plant decides where your climb rises.

### Tier growth
| Source | Gain |
|---|---|
| Autumn plot | +1 tier |
| Winter plot | +2 tiers |
| Deep Roots charm | Autumn +2 |
| Late Frost charm | Winter +3 (start guardians −1 crease) |
| First Fruit charm | First harvest of the year +1 |
| Overflow past T4 | +1 seed to the next burial |

### Damp
- **Range:** 0–100%
- **Gained by:** snow/water 25%/s; Frost Moth dust +50%
- **Lost by:** heat 33%/s, sun patch 12.5%/s
- **Effect:** at 100%: speed ×0.7, jump −25%, no dart. Shown on Folio (darker, dripping), no HUD meter.
- **Purpose:** forces routing through warmth; makes lantern/Sunblade valuable.

### Letter lines
- **Range:** 0–12; +1 per completed year (persistent)
- **Purpose:** the long story; 12 unlocks Write back.

There is **no currency**.

---

## 13. Characters / Units / Classes

### Roster Philosophy
One hero (Folio). Variety comes from **packs** (24 keepsakes × 4 tiers, 10 family pairs), seed-charms and folds, not characters.

### ✚ Content Unit Definition
- **One keepsake** = one verb (with T1–T4 numbers), one T4 trait, one landmark pop-up (piece list for T2/T3/T4), one landmark climb effect, one silhouette icon, one sound set. Pairs come free from its family; it adds one pair flavor line. Nothing else.
- **One enemy** = one paper stock, one behavior, at most two attacks, one tell per attack, one death fold.
- **One room** = descent grid + spring grid, 2–3 plot sockets, a bare route, enemy spawn sockets, header.
- **One peak** = 3 faces × (4 autumn + 3 winter rooms from its set), one peak guardian, one palette tilt.

### Readability Rules
Distinguish through silhouette first, then motion, texture, sound; color last.

✚ **Measurable readability test:** Folio is identifiable as a silhouette at **48 px tall**; Folio's vermilion scarf is the only saturated warm accent on screen in winter; the gameplay plane has the strongest value contrast in every frame; every keepsake icon is distinguishable as a silhouette at 32 px.

### Folio
- **Role:** the only playable character
- **Fantasy:** a small, brave sower folded from a letter
- **Strength:** agile, light, many bare movement options
- **Weakness:** 5 creases, flammable, soaks, knocked far
- **Signature mechanic:** burying keepsakes; paper folds
- **Stats:** §9, §12
- **Moves:** §7; pairs in content §9
- **Visual identity:** off-white letter paper with faint sepia handwriting, hinged puppet limbs, vermilion scarf, three keepsake icons on its back
- **Audio identity:** paper foley (folds, rustles, creases); no voice

---

## 14. AI / NPC Design

### AI Principle
- **AI should:** read like animals made of paper: territorial, readable, each with one clear habit; punish greed and button-mashing; respect the player's dodge.
- **AI should not:** attack from off-screen without an edge marker, chain attacks with no gap, spawn on top of Folio, or read inputs.

### States
Idle/patrol → notice (0.3 s alert fold) → approach → windup (tell) → attack → recover (punish window) → reposition. Thieves: steal → flee downhill. Landmark threats: seek nearest landmark → chew.

### Decision Inputs
Distance, line of sight, Folio's state (airborne, flattened, damp), last 3 s of Folio's actions (repeat-dodge punishers only on Hard Winters ≥8), landmark positions, wind direction.

### Difficulty
✚ **AI tick:** 30 Hz decisions on the 120 Hz sim; enemies use the same windup rules as listed in §11, never shortened below the tell minimum.

| Tier | Reaction | Aggression | Coordination |
|---|---|---|---|
| Normal (HW 0–4) | 400 ms | One attacker at a time per group | None |
| Hard (HW 5–9) | 300 ms | Two attackers | Wolf packs flank |
| Brutal (HW 10–15) | 220 ms | Three | Thieves target your highest-tier keepsake; guardians add one attack per phase |

Personality weights per enemy (aggression, caution, territory radius) live in the enemy data file.

---

## 15. Camera

### Default Camera
- **Perspective:** side-view perspective, FOV 32°, slight downward pitch (≈4°)
- **Zoom:** Folio ≈ 1/14 of screen height on desktop, 1/10 on phones
- **Tracking target:** Folio plus a lead offset (3 tiles in facing direction; 2 tiles down on descent, 3 tiles up on climb)
- **Smoothing:** critical-damped follow, ~0.2 s horizontal, 0.3 s vertical; snaps vertically on large falls

### Camera Priorities
1. Folio and the next 4 tiles of route
2. Active threats and their tells
3. Plots and landmarks in the room
4. The far planes and sky (mood)

### Special Camera States
| Event | Camera Response |
|---|---|
| Major impact | Shake per impact scale; no zoom |
| Guardian | Arena framing (locked bounds), slight zoom out |
| Low health (1 crease) | Subtle vignette and paper-edge darkening; no blur |
| The turn | Scripted pull up the face, then back to Folio |
| T3+ landmark rise | Brief frame on the landmark (skippable, 1.2 s) |
| Victory (summit) | Slow push in on Folio and the hoard |

---

## 16. Levels / Arenas / World

### Level Design Philosophy
Rooms are read twice. On the way down they're fast and dangerous, with plots offered at tempting and risky spots. On the way up they're vertical and slow, and the routes your burials created should be visibly better than the bare route. Every room teaches or recombines; nothing is filler (rule 12).

### Standard Metrics
- **Typical size:** 28–60 tiles wide, 16–40 tiles tall (1.5–3 screens)
- **Traversal time:** descent 25–50 s per room; climb 40–90 s per room (bare route ~2–3× landmark route)
- **Encounter density:** 1–2 encounters per room; 1 elite per band at most
- **Sightline philosophy:** plots are visible from the room entrance; threats are visible before they can attack

### Peaks
| Peak | Fantasy | Gameplay identity | Landmarks (signature) | Hazards | Visual identity |
|---|---|---|---|---|---|
| Emberfell | Orchards and terraced fields in rust and ochre | Gentle slopes; teaches crumple, plots, damp | Terrace walls, apple trees | Gourds, burrs, first snow | Warm |
| The Glasswater | Lakes and frozen falls | Ice physics, water routes, thin ice | Frozen falls that thaw into climbable cascades | Thin ice, meltwater, the Pike | Teal, slate |
| The Long White | Wind-scoured high mountain | Wind and avalanche; fewer plots, bigger growth | Wind-carved arches | Gusts, avalanches | Blue-white, black rock |

Spawn logic: enemies only at authored spawn sockets ≥6 tiles from Folio and off-screen or behind a tell; fliers enter from screen edges. Objectives: exit the room (descent/climb), defeat the guardian (floor), reach the Hearth (top).

---

## 17. Progression

### Within-Session (run) Progression
Keepsake tiers via burial and replanting; seed-charms at Hearths; letter line per year.

### Permanent Progression
Fallow greening (one patch per completed year, one grove per summit) unlocks keepsakes into the pool (one per two completed years), folds (cosmetic + one small bare-move twist), peaks (onboarding §12), Hard Winters levels, Endless Years. The Herbarium records landmarks. Harvest ending adds three permanent starting options per peak.

### Unlock Philosophy
- **Unlocks should provide:** new options, new places, more story.
- **Unlocks should not:** add raw damage, health or growth multipliers.

### Economy
| Currency | Earned From | Spent On |
|---|---|---|
| None | — | — |

---

## 18. Modes

### Run (v1)
- **Players:** 1 · **Objective:** survive three years and the summit · **Length:** ~40 min · the core game.

### Hard Winters 1–15 (v1)
- Run with stacked modifiers (fewer plots, earlier frost, guardians eat a landmark, shorter Hearths, smarter AI per §14).

### Daily Mountain (v1)
- One seeded run per day; leaderboard by score (§6); ghost of the leader via Shell replay.

### Endless Years (v1.1, post-launch first update *(working default)*)
- After the summit, autumn returns on a new face with your harvest; each year harder; score = years survived.

### Practice (v1)
- Room select from any cleared room with any unlocked pack (Shell `TrainingManager`).

---

## 19. Difficulty

### Philosophy
- **Difficulty should test:** reading tells, choosing burials, routing the climb, executing pairs.
- **It should not require:** grinding, memorizing hidden rules, or twitch precision beyond Celeste's mid chapters.

### Difficulty Variables
Enemy behavior (§14), encounter composition, plot count and placement, damp and frost pressure, guardian phases, Hearth benefits. Not HP inflation except guardians (+10% per 5 HW levels, cap +30%).

### ✚ Pacing Curve (per run)
| Stage | Active-enemy cap | Spawn cadence | New threats introduced | Player should be learning |
|---|---|---|---|---|
| Y1 autumn (rooms 1–4) | 3 | Pre-placed only | Leaf Mite, Acorn Jay, Bark Beetle, Rook | Verbs, first plot, crumple |
| Y1 winter (5–7) | 4 | Pre-placed + 1 flier wave | Frost Moth, Snow Hare, Icicle Bat | Damp, two-tier plots |
| Y1 guardian | Boss + 3 wolflings (phase 2) | Scripted | Drift Wolf | The guardian tests what you kept |
| Y1 climb | 3 | Pre-placed | Mudling, Hornet, Thaw Toad | Landmark routes, harvest |
| Y2 descent | 4–5 | Pre-placed + 1 wave | Fox Paper, Drift Lurker, Rime Crab, theft (Stoat) | Replanting, theft |
| Y2 guardian | Boss | Scripted | Icefall Stag / peak guardian | Floor hazards |
| Y2 climb | 4 | Pre-placed + 1 wave | Gnaw Vole, Thorn Snake | Protecting landmarks |
| Y3 descent | 5–6 | Pre-placed + 2 waves | Ice Ram, Wolfling packs, an elite | Pairs under pressure |
| Y3 guardian | Boss | Scripted | Long Night / peak guardian | Light verbs, reading in the dark |
| Y3 climb | 5 | Pre-placed + 2 waves | Weed King, Bloom Wasp Queen | Full kit |
| Summit (climax) | Boss + thrown keepsakes | Scripted | Magpie King | Losing and recovering your kit |

✚ **Spawn rules:** never within 6 tiles of Folio or on screen without a 0.6 s entrance tell (a flutter or snow puff at the socket); fliers enter from screen edges with an edge marker; hard cap 6 active enemies in view; no respawns in cleared rooms.

---

## 20. UX Flow

### Master Flow
Built on the Shell flow (title → menu → mode select → setup → play → pause → results). Differences:
```
BOOT → TITLE → (first launch: OPENING → FOOTHILL tutorial) → THE FALLOW (hub = main menu)
 ↓
PEAK SELECT (peak, Hard Winters level) / DAILY / PRACTICE / HERBARIUM
 ↓
RUN: autumn → winter → GUARDIAN → THE TURN → thaw → bloom → HEARTH  (×3 years)
 ↓
SUMMIT → ENDING CHOICE → ENDING → RESULTS
 ├─ RETRY (same peak)
 └─ THE FALLOW
```
Death → torn sequence → RESULTS.

### Edge Cases
- **Controller disconnect:** pause; resume on reconnect or any device input.
- **Focus loss:** pause; audio ducks to 0.
- **Pause:** sim frozen; menu per production §5.
- **Quitting mid-run:** run saved at the current room's entry; Continue resumes.
- **Restarting:** "Abandon run" from pause (confirm), counts as a loss, credits completed years.
- **Death:** torn sequence (skippable after first time), results.
- **Failed load:** retry once, then fall back to the synth audio and procedural textures; never block boot on an asset.
- **Corrupted save:** Shell `SaveManager` integrity check; restore the last good backup; if none, keep meta and drop the run with a one-line notice.
- **No input device:** title waits; any device input binds.

---

## 21. UI / HUD

### Information Hierarchy
1. Folio and threats (in-world)
2. What's in the three slots (and tiers)
3. Folio's condition (creases, damp) — shown **on Folio**, not the HUD
4. Where plots and blooms are (in-world)

### HUD Elements
| Element | Purpose | Location | Visibility |
|---|---|---|---|
| Three pack tabs | Keepsake silhouette + tier pips per slot; selected slot during bury | Bottom center (touch: on the verb arc) | Always |
| Bury ring | Hold progress | Around the plot in-world | While holding |
| Year/band tag | Where you are | Top left, small torn tag | 2 s on room entry, then hides |
| Off-screen threat marker | Silhouette edge marker | Screen edge | When a targeting enemy is off-screen |
| Guardian creases | Boss health as crease marks on a paper strip | Top center | Guardian fights only |

✚ **HUD budget:** three pack tabs, a guardian strip in boss fights, a room-entry tag, off-screen markers. **Nothing else.** Creases and damp are on Folio's body. No popups for states that already show on Folio or the tabs.

### UI Style
- **Shape language:** paper tags with a hard 2–3 px offset shadow and slight rotation
- **Typography:** warm display serif (Young Serif) for titles; humanist sans (Karla) for labels
- **Motion:** tags fold in and out like paper; no slides or fades without a fold
- **Sound:** paper flips and taps
- **Menu philosophy:** few screens, big targets, controller-first focus, everything reachable in ≤3 inputs

### ✚ Glossary (player-facing terms; one meaning each; most are never written)
| Term | Meaning | Written in UI? |
|---|---|---|
| Keepsake | A carried item that is a verb | Item names only |
| Scrap | A carried item with no verb that rots when buried | No |
| Tier | A keepsake's growth level, I–IV | As pips |
| Plot | A burial socket | No (stake icon) |
| Bury | Plant a carried item | Button prompt glyph |
| Landmark | What a burial grew into | Herbarium only |
| Bloom | The harvest at a landmark's top | No |
| Harvest | Take the evolved keepsake | Ending name |
| Crease | One point of Folio's health | No |
| Damp | Soaked paper state | No |
| Hearth | Rest point at the top of a face | Yes (screen title) |
| The Fallow | The home valley (hub) | Yes |
| Year | One face: descent, guardian, climb | Tag |
| Seed-charm | Run-long passive chosen at a Hearth | Charm names |
| Pair | Two verbs pressed together | Move list only |
| Hard Winters | Ascension levels | Yes |

### ✚ Callouts & Copy
**No in-run callouts.** No "PARRY!", no damage numbers, no "LANDMARK GROWN!". Events speak through sound, flash and motion. Text appears only for: item and charm names on pickup (1.2 s, small tag), menu labels, results numbers, and the letter. Tone: plain, quiet, short; never jokey; no system names in fiction.

---

## 22. Tutorial / Onboarding

### Player Should Learn
Within the **10-minute Foothill**:
1. Each slot is a move.
2. Burying makes space and grows the item; winter grows more.
3. The guardian tests what you kept.
4. Spring: climb what grew, harvest it.

### Teaching Order
Full room-by-room plan: `discard-to-ascend-onboarding.md` (F1 run/crumple → F2 flatten/dart → F3 first keepsake → F4 full pack → F5 first plots → F6 winter → F7 short Drift Wolf → the turn → climb F6/F5 in spring → Hearth → the Fallow).

Demonstrate → attempt → reinforce; no text boxes.

✚ **Prompt retirement:** each glyph prompt fades the first time the player performs the action and never returns (unless the assist "Show prompts" is on). Onboarding ends with **the first Hearth and one letter line**, then the Fallow menu opens for the first time.

---

## 23. Visual Direction

### Visual Thesis
A lit pop-up book of a mountain. Every surface is real paper in layered planes with real space and real shadows between them. The same cuts change by season through palette, light, snow and growth. The signature is engineering: burials rise as hinged pop-up sculptures. Full rules: `discard-to-ascend-art-bible.md`.

### Character Art
- **Proportions:** small, simple, ~1:1.6 head-to-body; readable at 48 px
- **Shape language:** folded angles, triangles and soft creases; enemies are animal silhouettes in cut paper
- **Detail density:** low; detail lives in paper texture and edges
- **Materials:** paper stocks only (letter, tissue, card, wax, foil, felt)
- **Silhouette requirements:** every enemy unique in silhouette; every keepsake icon unique at 32 px

### Environment Art
- **Geometry:** 5–7 planes per room; flat slabs with thickness; landmarks as pop-up assemblies
- **Texture density:** one paper stock per plane; grain and fibers
- **Lighting:** one sun with soft shadows; point lights for lantern, Sunblade, Hearth
- **Color:** season palettes (art bible §2); Folio's vermilion scarf is the constant accent
- **Atmosphere:** fog to the horizon color; particles (leaves, snow, petals)

✚ **Value contrast rule:** far planes sit light and low-contrast (fogged); the gameplay plane has the strongest light/dark edge; the foreground frame is darkest but never overlaps the play path. Folio is always lighter than the plane behind it in autumn and spring and darker than the snow in winter, with the scarf as the anchor.

### ✚ Rendering Recipe
- `MeshStandardMaterial`, roughness 0.95, metalness 0, paper texture as map + bump (0.018)
- Planes are extruded shapes 0.05–0.08 deep, cast and receive shadows; soft PCF shadows (2048 on Medium)
- One directional sun + hemisphere fill, colors and angle per season (art bible §7)
- Fog from 34 to 80 units in the horizon color
- Snow caps as separate prebuilt strips per level (9 levels)
- High tier: backlit translucency on Folio and tissue enemies, depth of field on far and foreground planes
- No outlines, no bloom except on fire and the Sunblade, no chrome, no neon

### ✚ Asset Pipeline
Procedural first (the look test proves it): planes, trees, landmarks and creatures built in code from piece lists. Paper textures generated now, **scanned real papers in the art pass**. Silhouettes authored as vector shapes (SVG → Shape) in the art pass. All visuals load through a visual registry keyed by semantic ID, so art swaps never touch gameplay.

### Visual Anti-Targets
- Glossy plastic or 3D-modeled "realistic" props
- Painted gradients pretending to be paper
- Dark gothic murk
- Busy UI chrome

---

## 24. Animation Direction

### Animation Philosophy
1. Gameplay readability 2. Responsiveness 3. Personality (paper puppetry) 4. Realism (last)

### Style
- **Pose exaggeration:** strong; puppet poses held 2–3 frames at key moments
- **Anticipation:** short for Folio (responsiveness), clear for enemies (tells)
- **Follow-through:** paper flutter on cloak, scarf and edges
- **Smears / holds:** fold-snaps instead of smears; holds at hit frames during hitstop
- **Cancel behavior:** Folio's verbs cancel into jump/slide after active frames

### Required Animation Set
Folio: idle (breathing creases), run, start/stop skid, turn, jump/apex/fall/land, dart fold and glide, flatten, crumple ball and unroll, each verb family's use (strike 3-hit, thrust, smash, throw, block/parry, phase, hook swing, lantern raise, stitch, ring), pair poses (10), bury kneel, dig, harvest, hit react, damp sag, torn death, Hearth sit, ending poses.
Enemies: idle, move, notice, each attack windup/active/recover, hit, death fold.
Landmarks: unfold sequence per piece list; T4 moving part.

---

## 25. VFX Direction

### VFX Philosophy
Effects are paper: scraps, confetti-like tears, fold flashes, leaves, snow, petals, smoke as gray tissue wisps, fire as layered orange-yellow cut flames. Gameplay information always beats spectacle.

### Effect Families
| Family | Effect |
|---|---|
| Normal impact | Tear-white edge flash + 4–8 scraps in the target's stock color |
| Heavy impact | 2-frame paper flash, 12–20 scraps, small shake |
| Movement | Leaf/snow puffs on landing; air lines on dart |
| Ability | Per keepsake (fire flames, wind ribbons, bell rings as paper rings) |
| Resource gain | Mend: a stitch line closes across Folio |
| Resource spend | Bury: soil folds over; slot icon peels off Folio's back |
| Critical state | 1 crease: edge tears flutter on Folio |
| Death | Folio tears along its creases; pieces drift |
| Reward | Harvest: bloom folds into the keepsake icon and flies to the pack |
| Environment | Leaves, snow, petals, drips, wind streaks |

✚ **Signature effect:** **the pop-up rise**, hinged pieces unfolding base to crown with a pluck per piece. Reduce-Motion alternative: pieces appear with a quick fold-in over 0.3 s, no camera framing.

---

## 26. Audio Direction

### Audio Thesis
The game sounds like paper and a small chamber-folk ensemble in a quiet room: intimate, warm, close.

### Music (Mike, 2026-10-27: season-led score; synth in code now, real score later)
- **Genres:** chamber-folk (music box, solo cello, felt piano, fiddle, hurdy-gurdy, soft frame drum); one recurring gardener's motif
- **Energy curve:** autumn moving → winter sparse → guardian driving → the turn as a composed bridge → thaw hesitant → bloom full → Hearth intimate
- **Adaptive behavior:** cue per band and season per peak, crossfading on scene changes; guardian cues step up per **phase**, not per time; the turn is a fixed 6 s bridge
- **Pipeline:** Preserve's synth-in-code score with drop-in files per cue (`assets/music/<cue>.mp3`); 27 cues listed in production §4

### SFX
✚ **Distinct timbre rule:** every distinct event has its own sound; no generic alert. Stock-specific hit sounds (tissue rustle, card thud, wax squeak, foil crinkle, felt thump). Full cue sheet: production §4 and main spec §12.

| Category | Identity |
|---|---|
| Movement | Paper pats, fold snaps, scrunch rolls, dart whips |
| Attacks | Per keepsake (slice, thrust, thump, sling snap, bell, flare) |
| Impacts | By stock; heavier = lower and layered |
| UI | Paper flips and taps |
| Resources | Bury: spade + low bell; mend: needle pull; crease: dry crack |
| Pickups | Light rustle + item-specific chime |
| Environment | Wind, leaves, snow hush, drips, birds per season |
| Victory | Bloom chord; summit: the motif complete |
| Failure | Tearing, then silence, then a pen scratch |

### Voice
None. No VO, no barks. The letter is read, never spoken.

### ✚ Mix
SFX above music; Folio's own sounds above enemies' except tells, which always cut through (+3 dB, never masked). Music ducks 4 dB for 500 ms on heavy hits and 3 dB during a bury hold. Ambience drops to near silence on guardian floors. Buses: master, music, sfx, ambience, ui (Shell `AudioMixer`).

---

## 27. Haptics
| Event | Intensity | Duration | Pattern |
|---|---|---|---|
| Light hit landed | 0.2 | 30 ms | Single |
| Heavy hit / parry | 0.5 | 70 ms | Single |
| Damage taken | 0.6 | 90 ms | Double tick |
| Bury complete | 0.3 | 120 ms | Slow swell (the ground taking it) |
| Landmark rise (each piece) | 0.15 | 20 ms | Ticks in rhythm with the plucks |
| Harvest | 0.4 | 100 ms | Single bright pulse |
| Guardian phase break / climax | 0.8 | 180 ms | Strong + fade |
| Torn (death) | 0.5 → 0 | 600 ms | Long fade |

No continuous vibration. Haptics toggle and intensity slider in settings. Mobile uses the device vibration API only where supported.

---

## 28. Content Matrix

### Characters
| Character | Model | Animations | Portrait | FX | Audio | Complete |
|---|---|---|---|---|---|---|
| Folio | ☐ puppet rig | ☐ §24 set | n/a | ☐ | ☐ | ☐ |
| Enemies (28 + 6 elites) | ☐ | ☐ | n/a | ☐ | ☐ | ☐ |
| Guardians (6) + Magpie King | ☐ | ☐ | n/a | ☐ | ☐ | ☐ |

### Levels
| Level | Layout | Gameplay | Art | Lighting | Audio | Complete |
|---|---|---|---|---|---|---|
| Foothill (tutorial, 7 rooms) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Emberfell (≈24 rooms × 2 states + floors + summit) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Glasswater (≈24 × 2) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Long White (≈24 × 2) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| The Fallow (hub, greening states) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### UI
| Screen | Layout | Art | Navigation | Audio | Complete |
|---|---|---|---|---|---|
| Title, Fallow, Peak select, Pause, Hearth, Results, Herbarium, Settings, Endings | ☐ | ☐ | ☐ | ☐ | ☐ |

### Additional Content
| Type | Count | Complete |
|---|---|---|
| Keepsakes (T1–T4 + landmarks) | 24 | ☐ |
| Scrap | 8 | ☐ |
| Seed-charms | 30 | ☐ |
| Pair moves (family) | 10 | ☐ |
| Folds | 6 *(working default)* | ☐ |
| Music cues | 27 | ☐ |
| Letter lines | 12 | ☐ |
| Endings | 3 | ☐ |
| Storyboards | Opening, turn, Hearth, torn, 3 endings | ☐ |

---

## 29. Technical Design

### 29.1 Technology
- **Engine:** none (web); Three.js renderer inside the game repo
- **Language:** TypeScript (strict)
- **Renderer:** Three.js via the Shell's `ThreeAdapter` hooks; WebGL2
- **Physics:** custom fixed-step 120 Hz platformer sim on a tile grid with 45°/22.5° slope tiles
- **Audio:** game-side `AudioLayer` (WebAudio synth + drop-in samples) on the Shell's `AudioMixer` buses
- **Networking:** none (leaderboards through the Shell `LeaderboardManager`; backend chosen at Daily Mountain milestone)
- **Persistence:** Shell `SaveManager` (schema v1, integrity + backup)

✚ Engine choice follows `slu-engine-decision`: stays on web; no blocker named.

### ✚ 29.2 Foundation & Reuse
**Base:** Shell-generated.

```bash
node tools/create-slu-game.mjs --id perennial --name "Perennial" --renderer three --frames platformer,character-action
```
Then vendor the Shell at a pinned commit the way Preserve does (`vendor/shell/`), so builds work offline.

**Shell Frames:** `platformer`, `character-action` · **Shell modules:** checkpoints, results, ranking, leaderboards, replay/ghost, progression, training, simulation-speed, move list, loadout (3 slots), inventory (definitions), rulesets (Hard Winters), `AudioMixer`, `SaveManager`, `DeterministicRNG`, input, telemetry.

**Systems to lift** (port the design and data model; read every donor file first):
| System | Donor repo → path | Keep | Change |
|---|---|---|---|
| Platformer movement core | `preserve` → `src/simulation.js`, `src/tuning.js` | Fixed-step accumulator, coyote/buffer, jump cut, protected-feel discipline | Paper constants (§9), dart/flatten/crumple states, slope tiles |
| Shell boot and wiring | `preserve` → `src/main.js` | `SLUWebShell` setup, `ThreeAdapter`, `SaveManager`, semantic actions | Perennial actions (production §1) |
| Audio layer | `preserve` → `src/audio.js` | Synth fallback + drop-in samples per cue, buses | Chamber-folk synth voices, season cues |
| Replays/ghosts | `preserve` → `src/replays.js` + Shell `ReplayManager` | Input tapes, ghost playback | Daily Mountain only |
| Room-shot / headless checks | `preserve` → `tests/room-shots.cjs` | Headless render checks | Two states per room |
| Bot/sim harness pattern | `SpendYourself` → `tools/sim.ts` | Seeded headless sim runner | Hoarder/Sower/Reckless policies (§33) |
| Paper renderer | Look test → `prototypes/discard-to-ascend-paper-test.html` | Layer builder, snow caps, season blend, pop-up unfold, particles | Typed modules; tile-grid-driven layout; registry |

**Do not reuse:** Spend Yourself's design or `BodyDeck` (different game; it's still being tuned); Preserve's `DeathMaterials` rules (unrelated).

**Contributes back:** `SeasonPlots` (plots, growth, rot, harvest, replanting; reusable by Graceful Charity, Graverobber) and the **layered paper-cut renderer** as a Three.js helper (art-direction reuse for any paper game). Build both generic, with Perennial as the first consumer.

`REUSE_MAP.md` is not available in this environment; check it at repo creation for any better donor.

### 29.3 Architecture Principles
1. Gameplay simulation independent from rendering (`?headless` runs with no renderer).
2. One source of truth for mutable state (the sim).
3. Data-driven tuning (one tuning file, §31).
4. Events drive presentation and audio (semantic events only).
5. Inputs abstracted (Shell semantic actions).
6. Fixed 120 Hz timestep, render interpolation; deterministic for replays and bots.
7. Systems testable without rendering.
8. Seeded RNG only inside the sim; `Math.random()` for cosmetics only.
9. One file per system, reachable from the import graph; no runtime monkey-patching.
10. Procedural art and synthesized audio until the art pass.
11. `window.__GAME` exposes state for headless tests and tuning.

---

## 30. Source-of-Truth Rules
| Data | Owner |
|---|---|
| Gameplay numbers | `data/tuning.ts` |
| Keepsakes, pairs, stocks, enemies, charms | `data/content/*.ts` (semantic IDs) |
| Rooms | `data/rooms/<peak>/<id>.json` (descent + spring grids) |
| Run and room state | Simulation |
| Plots, growth, landmarks | `SeasonPlots` (owned by the sim) |
| Pack and verbs | `VerbKit` (owned by the sim) |
| Save data | Shell `SaveManager` via the persistence layer |
| UI state | Screen controllers |
| Visual mapping | Visual registry (semantic ID → factory) |
| Audio mapping | `AudioLayer` cue table |

---

## 31. Tuning

### Tuning Philosophy
Numbers are provisional unless marked **LOCKED**. All live in one file; the climb bot and balance sim read the same file.

### ✚ Tuning Table
| Group | Name | Value | Status | Why / reference |
|---|---|---|---|---|
| Sim | tickRate | 120 Hz | LOCKED | Determinism for replays and bots; matches Preserve's discipline |
| Movement | gravity | 30 t/s² | provisional | Lighter than Preserve's 38: paper floats |
| Movement | jumpVelocity | 11.5 t/s | provisional | ≈2.2 tiles high |
| Movement | runSpeed | 6.0 t/s | provisional | Damp 4.2 |
| Movement | coyote / buffer | 0.10 / 0.12 s | provisional | Celeste/Preserve-proven windows |
| Movement | dartFallCap | 2.2 t/s | provisional | Glide must cross 6-tile gaps from a 2-tile drop |
| Movement | flattenIFrames | 0.08–0.25 s | provisional | Hollow-Knight-generous dodge |
| Movement | crumpleMinSlope | 15° | provisional | Keeps crumple a slope tool |
| Health | creases | 5 | provisional | Enough for one guardian mistake per phase |
| Health | afterHitInvuln | 1.0 s | provisional | |
| Growth | autumnBonus | +1 tier | LOCKED | Core rule |
| Growth | winterBonus | +2 tiers | provisional | Must make winter burial tempting before the guardian |
| Growth | tierCap | 4 | LOCKED | Content unit has 4 tiers |
| Plots | autumnSockets / winterSockets | 3 / 2 | LOCKED | Mike, 2026-10-27 |
| Pack | slots | 3 | LOCKED | Mike, 2026-10-27 |
| Pairs | window | 80 ms | provisional | Fast enough to feel simultaneous, slow enough for touch |
| Combat | hitstop | 30 + 10×tier ms (+30 heavy, cap 120) | provisional | Impact scale §10 |
| Combat | folioKnockback | 4 tiles | provisional | Paper is light; ledges matter |
| Combat | parryWindow | 0.12 s (+0.03/tier) | provisional | |
| Guardians | HP (Y1/Y2/Y3/Magpie) | 30 / 55 / 80 / 110 | provisional | ≈90 s with a T1–T2 pack; ≈3 min bare |
| Magpie | stealInterval | 9 s | provisional | |
| Pacing | maxActiveInView | 6 | LOCKED | Readability law |
| Pacing | spawnMinDistance | 6 tiles | LOCKED | Arrowfall lesson |
| Run | targetLength | 40 min | provisional | 3 × ~14 min |
| Letter | linesPerYear | 1 | provisional | 12 lines ≈ 4 runs |

Full secondary values: `discard-to-ascend-tuning.md`.

---

## 32. Debug / Development Tools
- FPS/frametime overlay, draw calls (`?perf`)
- Collision and hitbox display (`?boxes`)
- Plot/landmark inspector: socket IDs, growth math, landmark footprint (`?plots`)
- State inspector via `window.__GAME`
- Time scale and frame advance (Shell `SimulationSpeed`)
- Invulnerability (`?god`)
- Free camera (`?cam`)

✚ **URL flags:** `?peak=emberfell&year=2&room=4`, `?season=spring`, `?pack=blade:3,hook:1,lantern:2`, `?charms=deep-roots`, `?guardian=wolf`, `?quick` (skip intro and turn), `?bot` (run the climb bot in-browser), `?step` (setTimeout step mode for headless browsers that never fire `requestAnimationFrame`), `?headless` (sim only), `?playtest` (telemetry on, debug UI off).

---

## 33. Telemetry / Playtest Metrics
| Metric | Target |
|---|---|
| Burial rate of the best keepsake in the pack (per year) | 25–70% |
| Guardian clear rate, full pack / one slot / bare | 85% / 60% / 25% (Normal) |
| Climb route choice | Landmark route used in ≥70% of rooms where one exists |
| Run length | 35–45 min median |
| Deaths per year | Y1 < 15% of runs torn; Y3 < 40% |
| Turn skip rate (first 5 runs) | < 20% |
| Hesitation at first plot holding a T2+ keepsake | median ≥ 2 s |
| Pair usage | ≥ 1 pair move per room by run 3 |
| Quit point | No single room with > 2× the average quit rate |

✚ **Balance harness:** `npm run sim` plays 10,000 seeded runs with **Hoarder**, **Sower** and **Reckless** policies (tuning §6). Rows it must hit: Sower has the highest win rate; Sower reaches T4 by Year 3 in ≥60% of runs; Hoarder wins more guardians but fewer climbs; Reckless loses more Y1 guardians. Plus `npm run climb-bot`: every spring room clearable bare within 3× par, every landmark socket reachable. Balance is measured, not felt.

---

## 34. Playtest Questions
- **Comprehension:** Did they understand burying grows things, and that winter grows more? How fast? Did anyone think burial was "discarding"?
- **Decision-Making:** Did they hesitate at plots? Did anyone bury their best before the guardian? Was any keepsake always kept or always buried?
- **Feel:** Did combat feel crisp? Did dart and crumple feel like paper? Did the pop-up rise land emotionally?
- **Readability:** Could they say why they lost a crease? Could they name what a landmark grew from?
- **Motivation:** What made them start another run: the letter, a braver burial, a T4? Where did interest drop?

---

## 35. Accessibility
- Full remapping on all devices; touch layout editor
- Hold/toggle for bury/dig and dart
- Subtitles: n/a (no voice); letter text size scales with the UI text-size setting
- Colorblind: every category also differs by shape, pattern, texture or motion (stocks, plots, winter stake mark, threats); season palettes have colorblind variants (art bible)
- Screen shake slider (0–100%); Reduce Flash (climax flash → vignette); Reduce Motion (removes camera pulls and parallax motion; never removes information)
- Game speed 70/85/100%; extra creases (+2); extended telegraphs; auto-glide; "show bare route" overlay
- High-contrast outline mode (gameplay plane and threats outlined)
- Audio cues all have visual equivalents (rule 9)
- No timing-calibration offset needed (no rhythm mechanics)

---

## 36. Performance Targets

### Target Hardware
Target: mid-range laptop (2019 Intel MacBook Pro or equivalent) in Chrome with other apps open. Mobile: 2021 mid-range Android (e.g. Pixel 6a) and iPhone 12 at Medium/Low.

### Targets
- **FPS:** locked 60 (Medium on target laptop; Low on target phones)
- **Resolution:** device-pixel-ratio cap 1.5 on Medium, 1.0 on Low
- **Frame time:** ≤ 16.6 ms; sim step ≤ 1 ms at 120 Hz worst case
- **Load time:** title in ≤ 3 s; first room in ≤ 6 s on broadband
- **Memory:** ≤ 400 MB on mobile
- **Draw calls:** ≤ 150 in the worst-case room (instanced particles, merged plane geometry)
- **Install size:** initial web load ≤ 20 MB (synth audio); with recorded score ≤ 120 MB streamed per peak

✚ **Worst case to profile:** a bloom-band room with 3 T4 landmarks, 200 petals, 6 enemies, damp shader on Folio, 7 shadowed planes on Medium (rule 14).

---

## 37. Save / Persistence
- **What saves:** settings, meta (Fallow, unlocks, letter lines, endings, Hard Winters, harvest shelf), Herbarium, records, stats, and the in-progress run. Schema in production §6.
- **When:** settings on change; run on every room entry and at Hearths; meta at year end, death and ending.
- **Slots:** one profile *(working default)*.
- **Cloud:** none on web; Steam Cloud and iCloud/Play Games via the native wrapper later.
- **Corruption fallback:** Shell integrity check → last good backup → keep meta, drop run, one-line notice.
- **Version migration:** one migration per schema bump; unknown fields kept.
- **Reset:** Settings → Data → Reset progress (confirm twice); never resets settings.
- **Temporary state:** in-room enemy states and damp are not saved; resuming starts the room fresh.

---

## 38. Multiplayer / Networking
Not in v1. Local co-op (a second paper figure sharing plots) is an open post-launch question (§46). Steam Remote Play Together would come free if local co-op ships.

---

## 39. Production Scope

### Must Ship
- Foothill tutorial; Emberfell, Glasswater and Long White (3 faces each); all rooms in both states
- 24 keepsakes × 4 tiers with landmarks; 8 scrap; 30 seed-charms; 10 pair moves
- 28 enemies + 6 elites; 6 guardians; Magpie King; 3 endings; the letter
- The Fallow hub with greening; Herbarium
- Hard Winters 1–15; Daily Mountain; Practice
- Keyboard, gamepad and touch parity; accessibility set (§35)
- Synth score and SFX for all cues; save v1

### Should Ship
- Recorded score for at least title, the turn, Hearth and endings
- Art-pass paper scans and authored silhouettes for Emberfell
- Folds (6)

### Nice to Have
- Endless Years at launch (working default: first update)
- Full recorded score
- Photo mode (Shell `photo`)

### Explicitly Out of Scope
- Online multiplayer, currency, crafting, dialogue, voice acting, procedural (non-authored) rooms, free-placement building, a map screen with backtracking

---

## 40. Build Order

### ✚ Phase 0 — Thesis Proof
One face of Emberfell (4 autumn + 3 winter rooms, both states), Folio's bare moves, 4 keepsakes (Ember Blade, Bramble Shield, Fish Hook, Tallow Lantern) + 2 scrap, plots, growth, rot, the turn, landmarks and harvest, the Drift Wolf, look-test renderer promoted. No hub, no meta.
- **Exit condition:** in a running build, at least 5 playtesters each play 3 years-worth (the face 3 times); ≥ 40% bury their best keepsake at least once before the wolf, and when asked, most describe it as a sacrifice and the climb as the payoff. If not, revisit growth and guardian pressure before anything else.

### Phase 1 — Foundation
Repo generated (§29.2); Shell vendored; sim, tile grid with slopes, `RoomLoader`, `VerbKit`, `SeasonPlots` with unit tests; gate command; E2E smoke; climb bot.
- **Exit condition:** gates green; Phase 0 content runs on the new foundation with feel matched (side-by-side with the Phase 0 build).

### Phase 2 — Core Playable
A full Emberfell run: 3 faces, replanting, Hearths, seed-charms (10), 12 keepsakes, all 10 pairs, the three shared guardians, the Magpie King, Harvest and Sow endings, results, retry.
- **Exit condition:** the complete run can be played from title to results and back on all three input devices.

### Phase 3 — Depth
All 24 keepsakes, 30 charms, paper stocks on all enemies, elites, Hard Winters 1–15, balance sim rows green.

### Phase 4 — Content
Glasswater and Long White, peak guardians, the Fallow greening, Herbarium, the letter and Write back, Daily Mountain.

### Phase 5 — Presentation
Art pass (scans, authored silhouettes, puppet animation, engineered pop-ups), recorded score drop-ins, full SFX, storyboards.

### Phase 6 — Polish
Game-feel pass, accessibility pass, mobile and controller parity passes, performance pass at the worst case.

### Phase 7 — Release Candidate
Shell release-readiness pass in full; trademark check; store pages; demo (Emberfell Year 1).

---

## 41. Verification
Every milestone verifies: builds, no runtime errors, flow completes, state valid, targeted tests, performance inside target, input works on all devices, saves round-trip.

### ✚ Gate Command
`npm run gates` = typecheck + unit tests (`SeasonPlots`, `VerbKit`, sim) + climb bot + balance sim smoke (1,000 runs) + Shell `verify` against the vendored Shell + E2E smoke. Run before every commit.

### ✚ End-to-End Smoke Test
Playwright drives the real build: title → Fallow → peak → play the first room (bot inputs) → bury → `?quick` to the guardian → win via debug → the turn → harvest → Hearth → abandon → results → retry → Fallow, on keyboard, gamepad (emulated) and touch (emulated). Fails if any screen has no way forward.

### Automated Tests (invariants)
- A burial always removes the item from the pack; a harvest always adds it (or swaps).
- Growth = tier + band bonus + charms, capped, overflow to seed; never negative.
- Every spring room is clearable with zero landmarks.
- Folio can never be outside legal room bounds.
- A run always terminates (torn, abandon or ending).
- Save round-trips; migrations preserve unknown fields.
- Same seed + same input tape = identical end state (replays, Daily ghosts).

✚ **Acceptance rule:** a feature is done only when proven in a running build with a screenshot, replay or test. A deploy is not done until its live URL has been loaded and played.

---

## 42. Definition of Done

### Gameplay
- [ ] Core loop is complete (descent, burial, guardian, turn, climb, harvest, Hearth, three years, summit).
- [ ] Every promised mechanic works (24 keepsakes, 10 pairs, stocks, damp, fire, charms).
- [ ] No dominant unintended strategy (balance sim rows green).
- [ ] Difficulty behaves as designed (Hard Winters 1–15).

### Content
- [ ] Hero complete. [ ] Three peaks + Foothill complete. [ ] 28 enemies, 6 elites, 6 guardians, Magpie King complete. [ ] Fallow, Herbarium, letter, 3 endings complete.

### Presentation
- [ ] Final paper assets integrated. [ ] Puppet animation pass. [ ] Final VFX. [ ] Final lighting per season. [ ] Final audio (synth or recorded per cue). [ ] No unintended placeholders.

### UX
- [ ] Start-to-finish flow. [ ] Every screen navigable on all devices. [ ] Pause works. [ ] Settings persist. [ ] Failure states handled. [ ] Keyboard, gamepad, touch work.

### Stability
- [ ] No blocker bugs. [ ] No recurring console errors. [ ] 2-hour soak passes. [ ] Saves survive restart. [ ] Performance target met at the worst case.

### Release
- [ ] Production build. [ ] Correct title/version. [ ] Icons. [ ] Credits. [ ] Store configuration. [ ] Release notes. [ ] ✚ Name cleared (*Perennial* is a common word; subtitle may be needed).

---

## 43. Definition of Great
The game succeeds creatively if:
1. **First-time players hesitate** at their first plot while holding a good keepsake (median ≥ 2 s), and talk about it afterwards.
2. **At least 40% of players bury their best keepsake before a guardian** within their first three runs, and those who do finish that year more often than those who don't.
3. **Players can point at a landmark and say what it grew from** without UI, in ≥ 90% of cases.
4. **Players watch the turn** (skip rate < 20% in their first five runs).
5. **Players come back for the letter:** most who finish one run start another, and testers quote a letter line unprompted.

✚ **Five-second clip test:** a silent five-second clip of a pop-up landmark unfolding on a paper slope in spring, with a small folded figure climbing it, identifies this game and no other.

*(Claude's draft; Mike signs off after playing the Phase 0 build.)*

---

## 44. Autonomous Decision Rules
1. Preserve the Design Pillars (§1) and Laws.
2. Preserve the Player Fantasy (a small, brave sower).
3. Preserve gameplay readability (tells, value contrast, HUD budget).
4. Preserve responsiveness (no movement lock over 0.25 s).
5. Prefer the simplest solution that supports the intended experience.
6. Do not add progression, mechanics, currencies, screens, or systems to fill perceived gaps. **Never add a currency.**
7. Do not remove intentional friction (burial cost, guardian pressure, damp) because smoother is easier.
8. Do not change LOCKED rules or numbers without documenting the reason.
9. If a choice is reversible and doesn't materially alter player experience, choose and continue.
10. Record meaningful assumptions in `DECISIONS.md`.
11. ✚ Prefer lifting a proven system (§29.2) over writing a new one.
12. When unsure whether something is paper-like, make it out of paper.

---

## 45. Builder Instructions
- Build continuously rather than stopping after every milestone.
- Keep the game playable throughout development.
- Test before integrating major changes.
- Prefer an end-to-end version before deep polish of isolated systems.
- Never silently substitute a different mechanic for a difficult one (especially burial, growth or pairs).
- Placeholder assets are fine but must stay replaceable through the registry.
- Don't treat placeholder quality as the visual target; the look test and art bible are the target.
- Optimize where measurement shows need, except the architecture already required (fixed step, instancing).
- Log assumptions instead of blocking on minor questions.
- ✚ Report only what is verified. "Pushed" is not "deployed"; "deployed" is not "playable." Say which.
- ✚ Never ship a truncated file: after any large write, confirm the file is complete and the build runs.

---

## 46. Open Questions
| Question | Importance | Current Lean (working default) | Blocks Build? |
|---|---|---|---|
| Shipping title (*Perennial* trademark) | Medium | *Perennial*; add a subtitle if needed | No |
| Names: Folio, the Fallow, peaks, guardians, Magpie King | Low | Keep defaults | No |
| Endless Years at launch or first update | Low | First update | No |
| Local co-op | Low | Not in v1 | No |
| Composer vs Mike's own score | Medium | Synth until Phase 5, then decide per cue | No |
| Number of folds | Low | 6 | No |
| Profile slots | Low | One | No |
| Pipeline Triage Score | Low | Skip unless `TRIAGE.md` turns up | No |
| Definition of Great sign-off | High | §43 draft; Mike judges after playing Phase 0 | No (Phase 0 first) |

---

## 47. Decisions Log
| Date | Decision | Reason | Affected Systems |
|---|---|---|---|
| 2026-10-27 | Stands alone; not built on Spend Yourself's structure | Spend Yourself is still being tuned and already makes discarding a cost | All |
| 2026-10-27 | Side-view descend-and-climb action roguelite | Strongest sow/harvest payoff; distinct in the set | Format |
| 2026-10-27 | Layered paper-cut look, code-built; art pass later | Best look per cost; no other game uses paper | Art |
| 2026-10-27 | Autumn→winter descent, spring climb | Payoff visible in the world | World, art, audio |
| 2026-10-27 | Burials become landmarks + evolved items | Both payoffs; they rhyme | SeasonPlots |
| 2026-10-27 | 3-slot pack + guardian at the bottom | Makes generosity hurt now | VerbKit, guardians |
| 2026-10-27 | Each item is a verb | Every burial is a loss in your hands | VerbKit |
| 2026-10-27 | Folded paper hero | Free paper verbs; one medium | Movement, art |
| 2026-10-27 | One mountain over three years, replanting | A's finish + C's compounding | Run structure |
| 2026-10-27 | Title *Perennial* | Names burial, return, compounding | Branding |
| 2026-10-27 | 2–3 plot sockets per room on different routes | The descent plans the climb | Rooms, SeasonPlots |
| 2026-10-27 | Letter "to whoever plants after me" | Sowing thesis in human terms | Story, meta, endings |
| 2026-10-27 | Verb pairs combine | Depth from three slots; burial costs twice | VerbKit, combat |
| 2026-10-27 | Season-led score | Mike's choice over keepsake-voice stems | Audio |
| 2026-10-27 | Synth score now, real score later | Proven Preserve pipeline | Audio |
| 2026-10-27 | Refit to Mike's 50-section template | Standard handoff format | Docs |

---

## 48. Reference Library
- **Gameplay:** Hollow Knight (use for: combat feel, tells, pogo · ignore: map, palette); Dead Cells (use for: run pacing, biome shuffle · ignore: currency); Celeste (use for: movement windows, assists · ignore: single-screen structure)
- **Art:** Tearaway, Lumino City, Paper Mario: The Origami King (use for: materiality, folds, pop-ups · ignore: cutesy tone)
- **Animation:** paper theatre and shadow-puppet hinges (use for: Folio's rig)
- **Camera:** Ori and the Blind Forest (use for: lead and smoothing · ignore: heavy screen effects)
- **UI:** the look test HUD tags
- **VFX:** paper confetti and torn-edge reference
- **Audio:** chamber-folk (music box, cello, felt piano, fiddle, hurdy-gurdy)
- **Playable reference:** https://claude.ai/artifact/Qd5QectGotx8MTKEPT4fz1

✚ Store reference images in the repo under `docs/refs/` with a README of what to take and ignore per image.

---

## 49. Handoff Checklist
- [x] One-sentence pitch exists.
- [x] Player fantasy is explicit.
- [x] Pillars are explicit.
- [x] Anti-pillars are explicit.
- [x] Core loop is defined.
- [x] Win/loss conditions are defined.
- [x] Player verbs are defined.
- [x] Controls are defined.
- [x] Game-feel requirements exist for defining actions.
- [x] Major systems and interactions are resolved.
- [x] UX flow is mapped.
- [x] Visual target is concrete (look test + art bible).
- [x] Animation direction is concrete.
- [x] VFX direction is concrete.
- [x] Audio direction is concrete.
- [x] Required content quantities are known.
- [x] Performance target is known.
- [x] Accessibility expectations are known.
- [x] Build order exists.
- [x] Verification requirements exist.
- [x] Definition of Done exists.
- [ ] Definition of Great exists (**drafted; Mike signs off after playing Phase 0**).
- [x] Autonomous decision rules exist.
- [x] Blocking design questions are resolved.
- [ ] References are attached (look test linked; image refs to collect into `docs/refs/`).
- [x] ✚ The Bet is stated and Phase 0 tests it.
- [x] ✚ Base repo and lifted systems are named (§29.2).
- [x] ✚ Every resource, tell and counter has numbers.
- [x] ✚ Pacing curve exists.
- [x] ✚ Every open question has a working default.
- [ ] ✚ Engineering prerequisites (Mike creates the `perennial` repo on GitHub; `TRIAGE.md` and `REUSE_MAP.md` not found).

---

## 50. Final Handoff Directive
Build the game described by this document, not merely the feature list.

The intended result is:
**A quiet, beautiful paper-cut roguelite where every run asks you to give up what keeps you safe, and every spring proves, in the shape of the world itself, that it was worth it.**

When forced to choose between technically satisfying a feature and preserving its intended experience, preserve the intended experience.

The project is finished only when it satisfies both:
1. Definition of Done
2. Definition of Great

### ✚ Repo Packaging
At handoff this document is split into the repo as:
- `docs/GDD.md`: this whole document.
- `CLAUDE.md`: the builder's law (draft below).
- `DECISIONS.md`: seeded from §47.
- `docs/refs/`: §48 assets; `docs/data/`: the companion tables.

**`CLAUDE.md` draft:**
```
# Perennial: builder law
Read docs/GDD.md. This file is the short law; the GDD is the source of truth.
- Pillars: Giving is the strategy. The world remembers. Everything is paper. Quiet clarity.
- Laws: burying always costs something now; every climb is finishable bare; the spring shows the
  autumn; threats read by shape and motion first; no currency, ever; verified, not reported.
- Never: storage/banks for gear, damage numbers or callouts, text tutorials, movement locks >0.25 s,
  effects paper couldn't make.
- Stack: TS + Vite + Three.js via the Shell's ThreeAdapter; vendored SLU Web Shell; fixed 120 Hz sim;
  seeded RNG in sim only; one tuning file; semantic events drive art and audio.
- Modules: SeasonPlots (plots, growth, harvest), VerbKit (pack, verbs, pairs, stocks). Pure, tested.
- Gate: run `npm run gates` before every commit. Prove each phase's exit condition in a running build.
- Open questions: use the working default in GDD §46 and log it in DECISIONS.md.
- Report only what is verified: pushed ≠ deployed ≠ playable.
```

### ✚ Handoff Prompt (paste into the builder session)
```
Build Perennial from docs/GDD.md in this repo. CLAUDE.md is the law.
Set up the foundation exactly as §29.2 specifies, then work through §40 phase by phase without
stopping, keeping the game playable. Run the gate command before every commit. Prove each phase's
exit condition in a running build. Use the working default for any open question in §46 and log it
in DECISIONS.md. The game is finished only when §42 and §43 are both met.
```
