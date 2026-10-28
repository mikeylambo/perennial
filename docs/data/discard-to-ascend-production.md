# Discard to Ascend / Perennial: Production Sheets

How Perennial sits on the SLU Web Shell, plus the storyboards, audio cue sheet, screens and save format the builder needs. Written 2026-10-27 after reading the Shell (`mikeylambo/Web-Game-Shell-v1.02`, `AGENTS.md`, frames, assemblies, modules, adapters) and how its two Three.js/TS consumers use it (Preserve vendors the Shell and runs Three.js through `ThreeAdapter`; Spend Yourself depends on it as `@slu/web-shell`).

## 1. Fitting Perennial to the Shell

### What the Shell gives, and what the game supplies
The Shell owns flow and state: boot, title, menus, settings, the semantic input layer, saves (`SaveManager` with schema versions), results and ranking, leaderboards, replay and ghosts, checkpoints, training, progression, audio **buses** (`AudioMixer`), telemetry and release certification. By design it does **not** implement physics, combat, enemy AI, level content or a sound engine (`docs/MODULE-MATRIX.md`, "What remains game DNA"). Perennial supplies those, as Preserve does.

### Repo and setup
- New repo **`perennial`** generated with `node tools/create-slu-game.mjs --id perennial --name "Perennial" --renderer three --frames platformer,character-action`, then the Shell vendored the way Preserve does it (so the game builds offline and is pinned to a known Shell commit).
- **Frames composed:** `platformer` (checkpoints, results, leaderboards, replay, ghosts, progression) + `character-action` (training, ranking, simulation speed, move list, difficulty). The `AssemblyComposer` shares duplicate modules, so there is one ResultsManager and one ProgressionManager.
- Three.js stays inside the game repo behind `ThreeAdapter` hooks (`onLoadLevel` builds a room's paper layers; `onResize`, `onFade`, `onScreenshot`). The Shell stays renderer-neutral (AGENTS.md).

### Module map
| Need | Shell piece | Game-side work |
|---|---|---|
| Menus, pause, settings | Shell flow + `ui-shell` | Paper-tag skin (art bible §8) |
| Input | `InputManager` semantic actions | Bindings below; touch layout; pair detection window |
| The pack | `LoadoutManager` with three slots (`slot.1–3`, accepts `keepsake` or `scrap`) | Swap and drop rules |
| Keepsake registry | `InventoryManager.register` for definitions | Tier data in `VerbKit` |
| Room entry resume | `CheckpointManager` (capture/restore hooks) | Snapshot of run + face state |
| Run results, letter grades | `ResultsManager` + `RankingSystem` | Run scorecard: years, tiers grown, creases, time |
| Daily Mountain, Endless Years boards | `LeaderboardManager` | Seeded run IDs |
| Ghosts for Daily | `ReplayRecorder` / `GhostPlayback` | Fixed-step input tapes (as Preserve) |
| Practice rooms | `TrainingManager` | Room-select practice with any pack |
| Pair move list | `MoveList` | Registered from `VerbKit` pairs |
| Hard Winters | Shell difficulty + `RulesetManager` | Modifiers per level (tuning §) |
| Fallow growth, unlocks, letter lines | `ProgressionManager` | Unlock table (onboarding §12) |
| Audio | `AudioMixer` buses (`master, music, sfx, ui, voice, ambience`) | Perennial's own `AudioLayer` (Preserve pattern) |
| Saves | `SaveManager(storage, "save", 1)` | Schema in §6 |
| Telemetry | Shell telemetry | Events in tuning §8 |

### New game modules (pure, renderer-free, portable to C# or GDScript)
- **`SeasonPlots`:** plots and sockets per room, burial, growth tiers (keepsake tier + band bonus + charms, cap and overflow seeds), rot, landmark records (tier → size class → collision footprint id), harvest, replanting across years, and face state for saves. Emits `item.bury`, `plot.rot`, `landmark.rise`, `landmark.harvest`.
- **`VerbKit`:** keepsake definitions and tiers, the three-slot pack, verb execution timing (startup, active, recovery), pair detection and pair moves, paper-stock damage resolution. Emits `verb.use`, `verb.hit`, `pair.use`.
- **Game-side, not modules:** `PaperBody` (Folio's movement and paper states, started from Preserve's fixed-step simulation as tech reuse: accumulator loop, coyote/buffer, jump cut), `EnemyDirector` (behaviors and tells), `RoomLoader` (two-state room data → collision grid + presentation layers).

### Collision and rooms
- Gameplay is an authoritative **tile grid with slope tiles** (45° and 22.5°), so crumple and slides work and the climb bot can read it. Paper ridges, trees and landmarks are presentation drawn over the grid (rule 6). The look test's curves become the art over these tiles.
- A room file holds `descent` and `spring` grids sharing plot socket IDs, plus landmark sockets per tier and a small header (band, peak, face, sockets, intended bare route).
- Fixed-step simulation at 120 Hz with render interpolation, so replays, ghosts and the climb bot are deterministic (`DeterministicRNG` seeds the room shuffle and drops).

### Semantic input actions
`move.left`, `move.right`, `move.up`, `move.down`, `jump`, `slide`, `verb.1`, `verb.2`, `verb.3`, `bury`, `interact`, `pack.inspect`, `pack.swap`, `map.open`, `pause`, `ui.confirm`, `ui.back`. Pairs are detected in `VerbKit` when two verb actions start within **80 ms** (or one is held and another pressed), so no new input actions are needed for pairs.

### Verification (CI, as Preserve and Spend Yourself do)
- Unit tests for `SeasonPlots` and `VerbKit` rules, including every edge case in content §7.
- The **climb bot** (tuning §7) and the **balance sim** (tuning §6) headless.
- Shell `npm run verify` stays green against the vendored Shell; browser E2E for the full boot → run → Hearth → results → retry → menu loop on keyboard, gamepad and touch (rule 10).

## 2. Storyboards (in-engine, wordless)

### Opening (8 s, first launch; skippable after)
A closed paper book on a table, lamplight. It opens: the Fallow in grey pop-up. A sealed letter lies on the valley floor. The seal cracks and the letter folds itself, crease by crease, into Folio, who stands, looks up at Emberfell and walks. Control fades in during the walk.

### The turn (6 s, every year; 2.5 s after the first time)
The guardian falls into the snow. The camera pulls up the face. Snow caps shrink ridge by ridge, the palette warms, and each plot pops up in order from the bottom, with a pluck per piece. Rotted scrap sags last. The camera settles on Folio at the valley floor, now in spring. Control returns.

### Hearth (on arrival, 4 s)
Folio sits by a small paper fire. A pop-up plate of the year's face rises beside it with every landmark grown. The newly legible letter line writes itself across the plate in the gardener's hand. Then the Hearth menu.

### Endings (about 30 s each)
- **Harvest:** Folio walks down to the Fallow with three keepsakes on its back; one more patch turns green; it sets them on a shelf in a small paper house.
- **Sow the summit:** Folio buries the hoard; the camera pulls back as the whole mountain flowers, petals carrying the gardener's handwriting.
- **Write back:** Folio unfolds flat on the summit rock. New handwriting (the player's run: what they buried, what rose) fills the sheet. The sheet folds into a new Folio in a fresh paper stock, and the Fallow is fully green below.

## 3. Asset list (first full run, Emberfell)

| Type | Count | Notes |
|---|---|---|
| Room files | 7 per face × 3 faces + guardian floors + summit | Two grids each |
| Paper cut kits | Autumn/winter band kits for Emberfell | Ridges, trees, rocks, shrines, plots, Hearth |
| Landmark pop-ups | 12 keepsakes × T2–T4 | Built in code from piece lists (look test pattern) |
| Folio puppet | 1 rig, 3 swapped forms (flat, dart, ball) | Hinged pieces, crease and damp states |
| Enemies | 14 (autumn 8, winter 6) + 3 elites | Paper stocks per content §10 |
| Guardians | Drift Wolf, Icefall Stag, Long Night, Magpie King | |
| Paper stocks (textures) | 6 generated now, scanned in the art pass | |
| UI | Paper-tag kit, pack tabs, keepsake silhouettes | |

## 4. Audio cue sheet

Every cue is a semantic event; the audio layer picks takes, layers and buses (rule 17). Every cue has a visual equivalent (rule 9).

### Pipeline (Mike, 2026-10-27: code synth now, real score later)
Perennial uses **Preserve's proven pipeline**: a synth score and synth SFX written in code play everywhere; dropping a recorded file named after a cue into `assets/music/` or `assets/sfx/` replaces that cue, with no code change. Several takes (`cue.1`, `cue.2`) are picked at random with slight pitch drift. Missing files fall back to the synth. The final score is dropped in one cue at a time by a composer or Mike's own pass; this sheet is the brief.

### Music cues (season-led score; loop cleanly; crossfade on scene changes)
Palette across the game: music box, solo cello, felt piano, fiddle, hurdy-gurdy, soft frame drum. One **main motif** (the gardener's theme) recurs in every arrangement.

| Cue | Plays | Brief |
|---|---|---|
| `title` | Title, menus | Music box alone with the motif; a cello joins on loop |
| `fallow-grey` / `fallow-green` | The hub (blend by greening) | Grey: sparse piano. Green: piano, fiddle, birds |
| `<peak>-autumn` ×3 | Autumn band | Warm, moving, fiddle and hurdy-gurdy drone; walking tempo |
| `<peak>-winter` ×3 | Winter band | Sparse, slow, felt piano and bowed glass; long silences |
| `turn` | The turn | A composed bridge: winter harmony thaws into spring in 6 s |
| `<peak>-thaw` ×3 | Thaw band | Hesitant, pizzicato, the motif half-remembered |
| `<peak>-bloom` ×3 | Bloom band | Full ensemble, the motif complete, rising |
| `guardian-wolf`, `guardian-stag`, `guardian-owl` | Year 1–3 guardian floors | Frame drum and low strings; tempo and density rise per phase |
| `guardian-<peak>` ×3 | Peak guardians | Each peak's palette tilted (Glasswater: glassy; Long White: wind and brass) |
| `magpie` | Summit fight | The motif stolen: played wrong, glittering, until phase 2 restores it |
| `hearth` | Hearths | Solo cello by firelight; the letter line plays its own short phrase |
| `ending-harvest`, `ending-sow`, `ending-writeback` | Endings | The motif in three arrangements: homeward, vast, intimate |

27 music cues at launch.

### SFX (selected; full list in the main spec §12 event list)
| Event | Sound |
|---|---|
| `move.flatten` / `move.dart` / `move.crumple` | Crisp fold / whip of air / scrunch then rolling crinkle |
| `crease.take` | Dry paper crack; at 1 crease, a tearing edge |
| `paper.damp` / `paper.dry` / `paper.burn` | Muffled soak / crackle drying / flare and hiss |
| `item.bury` | Soft spade and low bell |
| `plot.rot` | Sagging creak, dull thud |
| `landmark.rise` | Rising pluck per piece unfolding, a chord at the crown |
| `landmark.harvest` | Bright bell and paper flutter |
| `verb.use` / `verb.hit` | Per keepsake (blade: paper slice; hammer: card thump; lantern: whoosh) / crinkle tear with hitstop |
| `pair.use` | Both verbs' sounds layered with a fold snap |
| `enemy.hit.<stock>` | Tissue rustle, card thud, wax squeak, foil crinkle, felt thump |
| `season.turn` | Melting drip swell into birdsong |
| `letter.line` | Pen scratch, soft breath |

### Ambience
Per band and season: autumn wind and leaves, winter hush and creaking snow, thaw drips and running water, bloom birds and insects. Guardian floors drop ambience to near silence.

## 5. UI screens and flows

`Boot → Title → (first time: Opening → Foothill) / (returning: the Fallow) → Run: autumn rooms → winter rooms → Guardian → Turn → thaw rooms → bloom rooms → Hearth → … Year 3 → Summit → Ending → Results → the Fallow`

| Screen | Contents | Back goes to |
|---|---|---|
| Title | Logo, Continue/Begin, Settings, Quit (desktop) | — |
| The Fallow | The hub as a pop-up valley: Climb (peak select), Herbarium, Daily Mountain, Endless Years, Hard Winters level, folds | Title |
| Peak select | Unlocked peaks as pop-up mountains; Hard Winters level | Fallow |
| Run | The game. HUD: three pack tabs with keepsake silhouettes and tier pips, crease marks on Folio itself, year and band as a small torn tag only on room entry | Pause |
| Pause | Resume, Pack (inspect, reorder), Move list (pairs for this pack), Settings, Abandon run | Run |
| Hearth | Mend (automatic), reorder slots, pick one seed-charm of three, the year's plate and letter line, Continue | — |
| Results | Years, tiers grown, tallest landmark, creases lost, time, grade; Retry same peak, Fallow | Fallow |
| Herbarium | Pressed landmarks by peak and tier; the letter as revealed so far | Fallow |
| Settings | Controls (rebind; touch layout editor), Audio (master, music, sfx, ambience, ui), Video (quality tier, reduce motion, reduce flash), Accessibility (assists from onboarding §13), Language | Previous |

Every screen is fully usable with keyboard, gamepad and touch, with a visible focus state and a sensible default focus (rule 10).

## 6. Save format

One versioned save through Shell `SaveManager` (rule 20), schema version 1 from day one.

```
save.v1 {
  version: 1,
  settings: { controls, touchLayout, audio{master,music,sfx,ambience,ui}, video{tier,reduceMotion,reduceFlash}, assists{...}, language },
  meta: { fallowGreen, peaksUnlocked[], keepsakesUnlocked[], foldsUnlocked[], hardWinters{peakId: level}, letterLines, endingsSeen[], harvestShelf{peakId: [keepsakeId+tier]}, summitsSown[] },
  herbarium: { landmarkKey: { tierBest, count, firstSeen } },
  run: null | { seed, peakId, year, band, roomIndex, creases, pack[3], charms[], plots{faceId: SeasonPlots.state}, hardWinters, startedAt },
  records: { daily{date: score}, endless{best}, bestRunMs },
  stats: { runs, summits, buried{keepsakeId: n}, rotted, tallestTier, playTimeMs }
}
```

- The run auto-saves on every room entry; resuming restores the checkpoint snapshot.
- Keepsakes, rooms and charms are keyed by stable semantic IDs, so content changes never break saves.
- One migration function per version bump; unknown fields are kept, not dropped.

## 7. Calls made (Mike, 2026-10-27)

Format, world, look, burial payoff, pressure, verbs, hero, run structure, title, plot sockets, letter, verb pairs, season-led score and the synth-then-real-score pipeline. The decisions log in `discard-to-ascend.md` §1 has each with its rejected options.

## 8. Pre-handoff prototypes

- Paper look test: https://claude.ai/artifact/Qd5QectGotx8MTKEPT4fz1 (`prototypes/discard-to-ascend-paper-test.html`). Promote its layer builder, snow caps, season blend and pop-up unfolding into the renderer (rule 5).
