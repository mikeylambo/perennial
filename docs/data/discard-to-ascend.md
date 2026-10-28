# Discard to Ascend / Perennial: Handoff Spec

Status: **design complete, ready for build handoff** (2026-10-27). Concept #14 on the canon list (Foolish Burial + Card Destruction: "bury your best to rise later"). Working title: ***Perennial***.
Owner: Mike. Built on the SLU Web Shell (`mikeylambo/Web-Game-Shell-v1.02`); its `AGENTS.md` constitution applies to every decision below.

**Pitch:** Bury your best. Climb what grows.

**Fantasy:** A small paper wanderer, folded from an old letter, carries three treasured things down a mountain as autumn turns to winter. Whatever it buries is gone for now. In spring it climbs back up through the same slopes, and everything it gave the ground has grown into something tall enough to climb and strong enough to wield.

**Genre:** single-player side-view 2.5D action roguelite. A run is one mountain over three years: down through autumn into winter, a guardian at the bottom, back up through spring. Layered paper-cut look, built in code. Web-first on the Shell.

**Thesis (from the card concept):** building means letting go. What you bury decides your late-game power, so you are weakest when you have been most generous. **Every burial asks whether you trust the spring.**

**Look test (2026-10-27):** https://claude.ai/artifact/Qd5QectGotx8MTKEPT4fz1 · source `prototypes/discard-to-ascend-paper-test.html`. Three.js r128, all code-built: layered paper slabs with real shadows, per-ridge snow caps, season palettes, falling leaves/snow/petals, and pop-up sculptures that unfold from buried items. Tested in headless Chromium at desktop and phone sizes with no errors; real phones and gamepad untested. The hero in it is a placeholder.

---

## 1. Decisions log (Mike)

| Date | Decision | Choice | Rejected |
|---|---|---|---|
| 2026-10-27 | Relationship to Spend Yourself | **Stands alone; no Spend Yourself structure.** That game is still being tuned and already makes discarding a cost. `BodyDeck` code may be borrowed only if ever useful; the design is not | Deckbuilder with a burial pile |
| 2026-10-27 | Format | **Side-view descend-and-climb action roguelite** | Turn-based grid crawler, deckbuilder |
| 2026-10-27 | Look | **Layered paper-cut, lit like a pop-up book**, code-built in Three.js; a dedicated art pass later (art bible §10) | Painted 2D, dark gothic, water-heavy |
| 2026-10-27 | World | **Autumn into winter on the way down, spring on the climb** | Canyon necropolis, flood and ebb |
| 2026-10-27 | Burial payoff | **The way up and the weapon:** each burial grows into a climbable landmark, and at its top you harvest an evolved version of the item | Terrain only, item only |
| 2026-10-27 | Pressure | **Three-slot pack and a winter guardian at the bottom** that you fight with only what you kept | Frost takes what you carry, pack limit only |
| 2026-10-27 | Items | **Each item is a verb.** Your three slots are your whole fighting kit | Fixed moves with passives, fixed weapon with specials |
| 2026-10-27 | Hero | **A folded paper figure**; bare moves come from paper | Old gardener, young acolyte |
| 2026-10-27 | Run structure | **One mountain over three years**, with replanting so harvests compound; endless years as a post-game mode (Claude's synthesis of options A and C; Mike confirmed) | Handcrafted campaign, pure endless |
| 2026-10-27 | Title | ***Perennial*** | *Sown*, *What Rises* |
| 2026-10-27 | Where you bury | **Two or three authored plot sockets per room**, each on a different route up: picking a plot picks your climb | Anywhere on soft ground, one fixed plot |
| 2026-10-27 | Combat depth | **Verb pairs combine:** pressing two verbs together makes a pair move; three slots give three pairs | Verbs separate, verbs charging each other |
| 2026-10-27 | Music | **Season-led score:** composed tracks per band and season, crossfading on the turn | Keepsake-voice stems, sparse diegetic |
| 2026-10-27 | Score production | **Synth score in code now, real score later** (Preserve's drop-in pipeline; a composer or Mike replaces cues one at a time) | Commission early, AI-generated score |
| 2026-10-27 | The letter | **"To whoever plants after me"**: written by the Fallow's last gardener to a stranger who would come later. Folio is the reply | An apology never sent, a love letter |

Defaults Claude picked where Mike didn't specify are marked *(default)* and are cheap to change.

**Distinct from the other handoffs:** Busted Blader is a survivors game, Last Law an isometric action roguelite, Mirroring an arena brawler, Spend Yourself a deckbuilder, Preserve a precision platformer about deaths, The Weigher a tactics reign. Perennial is the only game where **the level you return through is built from what you gave up**, and the only paper world.

## 2. World, hero and frame

**Folio** *(default name)* is a small origami wanderer folded from a letter nobody sent. Faint handwriting shows on its body when light passes through. It lives in **the Fallow** *(default)*, a grey home valley at the foot of the mountains, and every year it goes up to plant.

**The mountains:** three peaks at launch, each with three faces (one per year of a run). Each face has two bands: an **autumn band** high up and a **winter band** below, ending at a valley floor where a **guardian** waits. In spring the same bands come back as the **thaw band** and the **bloom band**.

**Story delivery:** wordless (rule 8). A pop-up plate opens each year. Enemies are named only on inspect. The Fallow greening over many runs is the long story. The ending (section 8) is a pop-up sequence with no narration.

**Subtle frame (structural, never stated):** "Unless a grain of wheat falls into the earth and dies, it remains alone; but if it dies, it bears much fruit" (John 12:24). The loop is that sentence: what you keep stays small; what you give grows. No scripture, religious names or iconography appear in the game. Folio being an unsent letter is the quiet emotional line: something written for someone, finally delivered as growth.

### The letter (the story across runs)
Folio is folded from a letter the **last gardener of the Fallow** wrote before the valley went grey: *to whoever plants after me*. The gardener hoarded the best seed for a better year that never came, and wrote to a stranger they would never meet. **Folio is that stranger's answer.**
- The handwriting on Folio's body is a blur at first. **Each completed year greens a patch of the Fallow and makes one more line legible** (12 lines, about four full runs). Lines show in the Hearth plate and on Folio when backlit; there are no text boxes (rule 8).
- The full text is in `discard-to-ascend-content.md` §8. It never names God, scripture or faith; it is one person's regret and hope.
- Reading the whole letter unlocks the third summit ending, **Write back** (section 8).

## 3. Core rules

### The pack
- Folio carries **three keepsakes**. Each keepsake is a **verb** bound to its own button (section 5). Three slots are the whole kit.
- Keepsakes have a **tier** from I to IV. Found keepsakes are tier I (common) or II (rare). Each tier changes the verb's strength and form.
- **Scrap** (bent nails, cracked cups, lost buttons) also fills slots. Scrap has no verb. It exists to be buried when you don't want to give up anything real, and it rots (below).
- Picking something up with a full pack means choosing what to drop or bury. Dropped items stay on that room's floor for the rest of the year.

### Burying
- Each room on the descent has **two or three plot sockets** (soil patches marked by a stake), each on a **different route up** in that room's spring state. Picking a plot picks where that landmark rises, so the descent is also planning your climb. Stand on a plot and hold **Bury** to plant one carried item. It's gone from the pack immediately.
- Winter-band rooms usually offer two sockets, one of them hard to reach.
- **What grows:** a buried keepsake grows **one tier** by spring. Buried in a **winter-band** plot, it grows **two tiers** *(default)*: the harder the winter, the bigger the spring, but those plots are closest to the guardian.
- **Scrap rots** into a **stump**: a small foothold, nothing to harvest.
- Plots hold one item each and are lost if the run ends.

### The guardian
At each valley floor, a winter guardian fights Folio with only what's in the pack. Bury everything and you face it bare (run, jump, slide, glide). It is beatable bare but very hard. This is the run's main test of how much you trusted the spring.

### The climb
- After the guardian falls, the season turns: snow melts, the palette blooms, and every plot on that face pops up as a **landmark**: a paper structure sized by its tier (I: a step, II: a ledge, III: a tower, IV: a mythic structure that changes the room).
- **Landmarks are the way up.** Every room has a slow, dangerous **bare route** so the climb is never impossible, plus faster, safer routes that need landmarks.
- **Harvest:** at the top of each keepsake landmark, a **bloom** holds the evolved keepsake. Take it into the pack (swapping if full), or leave it growing as the landmark only.
- Each landmark type also does something while you climb (a Sunblade warms nearby snowmelt hazards, a Thorn Bastion shelters you from the spring hornets).

### Years and replanting
- A run is **three years** on one peak. Year 1 and Year 2 end at a **Hearth** at the top of the face: mend creases, review the pack, then autumn returns and the next face begins.
- **Replanting:** harvested keepsakes go back into the ground next autumn and grow again. A tier I blade buried in winter in Year 1 comes back tier III; replanted in Year 2, it can reach tier IV. Compounding is the long arc of every run.
- Year 3's climb ends at the **summit** and the final boss (section 8).

### Folio's health: creases
- Folio has **5 creases** *(default)* of integrity. Each hit adds a crease; the body visibly wrinkles. At 0 it tears and the run ends.
- **Damp** (deep snow, meltwater, rain) soaks paper: slower, heavier, no glide until dry. Dry near fire, sun patches or a Sunblade.
- **Fire** is double damage to paper but thaws ice and dries you. Lanterns and flint are dangerous friends.
- Creases mend at Hearths and with the Needle keepsake.

## 4. Folio's bare moves (always available, from paper)

| Move | Input | What it does |
|---|---|---|
| Run, jump | move, jump | Light, floaty jump with a variable height |
| **Flatten** | down + slide | Folio folds flat to slide under gaps and dodge high attacks; brief invulnerability frames |
| **Dart** | hold jump in air | Folds into a paper dart and glides; wind lifts it; damp disables it |
| **Crumple** | slide on a slope | Balls up and rolls downhill fast; the descent's speed tool; bounces small enemies |
| **Dig** | hold bury on a plot | Plants an item; also digs up stashes in soft ground |

The descent is fast (crumple, dart, drops). The climb is where bare moves run out and landmarks matter.

## 5. Combat and controls

- **Three verb buttons**, one per pack slot. Slot order is chosen at the Hearth and when you pick something up.
- **Verbs by family:** strike (blade, spear, hammer, sling), guard (shield, cloak), move (hook, crampons, kite-string), tend (lantern, needle, bellows, bell). Full list with tiers: `discard-to-ascend-content.md`.
- **Enemies** telegraph with paper tells: a fold creasing before a lunge, a flutter before a dive. Shape first, color second (rule 9).
- **Bare combat:** crumple bounces small enemies, flatten dodges, and a stomp from a dart dive staggers. You can survive bare; you can't easily kill big things bare.

### Feel target
Tight and readable, in the Hollow Knight line: short commitments, clear tells, generous parry and dodge windows, no stamina bar. **Paper is light:** Folio flies far when hit, so knockback off ledges is a real threat, and enemies fly far too. Hits land with 40–70 ms hitstop, a paper-tear flash and a crinkle sound. Folio's own attacks never lock movement for more than 0.25 s.

### Verb pairs
- Press **two verb buttons together** (or hold one and tap the other) to perform a **pair move**. With three slots you always have three pairs, so every pack is a build.
- Pair moves are defined by **family pair** (strike, guard, move, tend), with each keepsake adding its own flavor: lantern + fan is a fire gust, hook + blade a swinging slash, shield + bell a shockwave parry. Full table: `discard-to-ascend-content.md` §9.
- A pair move uses the **lower tier** of its two keepsakes. Harvesting one evolved keepsake therefore upgrades up to two pairs, and burying one costs you two pairs: the sacrifice is felt twice.
- **Touch:** slide a thumb across two verb buttons. **Gamepad:** press two face buttons together, or RB plus a face button.

### Paper stocks (what enemies are made of)
Enemies are cut from five paper stocks, each readable by texture and motion before color (rule 9): **tissue** (flutters; tears to any hit; wind throws it), **card** (stiff; armored front; blunt or flank), **wax** (glossy; ignores damp; fire melts it fast), **foil** (crinkles and glints; reflects fire and light; blunt crumples it) and **felt** (fuzzy edges; soaks blunt; cuts tear it). Damage types are **cut, blunt, fire, wind and damp**; damp slows paper enemies just as it slows Folio. Guardians change stock between phases. Table: content §10.

### Controls (semantic actions)
`move`, `jump`, `slide`, `verb.1`, `verb.2`, `verb.3`, `bury`, `interact`, `pack.inspect`, `pack.swap`, `map.open`, `ui.confirm`, `ui.back`, `pause`. Mouse/keyboard, gamepad and touch all map to them, and the whole boot, menu, run, Hearth, results, retry and return loop works on every device (rule 10).
- **Gamepad:** stick moves, A jump, B slide, X/Y/RB the three verbs, LB bury.
- **Keyboard:** WASD/arrows, Space jump, Shift slide, J/K/L verbs, E bury.
- **Touch:** landscape. Left thumb: move pad. Right thumb: jump, slide, and the three verbs in an arc showing each keepsake's cut-paper icon. Bury appears as a contextual button only on a plot (rule 11).

## 6. Run structure: one mountain, three years

| Part | Contents | Target length |
|---|---|---|
| Descent, autumn band | 4 rooms, 1–2 plots each, keepsake finds, enemies | 4 min |
| Descent, winter band | 3 rooms, 1 plot each (two-tier growth), harder enemies | 3 min |
| Valley floor | Guardian fight | 2 min |
| Climb, thaw band | The winter rooms in spring state, landmarks risen | 2 min |
| Climb, bloom band | The autumn rooms in spring state | 3 min |
| Hearth | Mend, sort pack, see the year's landmarks on a pop-up plate | — |

Three years × ~14 minutes ≈ **40 minutes per run** *(default target)*. Rooms are drawn from **authored room sets** per band per face (each room authored in both its descent and spring state), shuffled per seed.

**Guardians:** Year 1 **the Drift Wolf**, Year 2 **the Icefall Stag**, Year 3 **the Long Night** (a vast snow owl) *(default names)*. Each peak swaps one guardian for its own.

## 7. Finds, rewards and economy

| Find | What it is |
|---|---|
| Keepsake | A verb item, tier I or II, from shrines, stashes and elite enemies |
| Scrap | Rot-fodder; cheap insurance |
| Stash | Dig spots in soft ground: a keepsake, scrap or a **seed-charm** |
| Seed-charm | A run-long passive that changes growth (e.g. *Deep Roots*: autumn plots also grow two tiers; *Wild Graft*: a landmark grows a random second verb) — 30 at launch |
| Hearth | Mend all creases, reorder slots, take one seed-charm from three |

There is **no currency**. The economy is the pack, the plots and time. This keeps the game about what you give up, not what you buy.

## 8. The summit and the ending

At the top of Year 3, the summit is bare rock. It's the one place no one has ever planted.

- **The Magpie King** *(default)*, a hoarder of glittering things, waits there. **Phase 1:** it steals a keepsake from your pack every few seconds and fights with it. Your landmarks from this year rise around the arena as cover and ledges.
- **Phase 2:** it flies above reach. Only your tallest landmark (the year's highest tier) reaches it.
- **The last choice:** with the Magpie down, its hoard spills: every keepsake it ever stole. Folio can carry three down to the Fallow, or **bury the hoard on the summit**.

| Ending | How | What it is |
|---|---|---|
| **Harvest** | Carry three keepsakes home | They become permanent starting options for future runs on that peak. Pop-up coda: Folio walks home and the Fallow gets one more patch of green |
| **Sow the summit** | Bury the hoard | The summit blooms for good: that peak's future runs start with a landmark at every Hearth. Pop-up coda: the whole mountain flowering, with Folio's letter-writing visible on every petal |
| **Write back** | Unlocked once the whole letter is legible | Folio unfolds itself flat on the summit, and new handwriting fills the sheet: the player's own run (what was buried, what rose) written as a letter to whoever plants next. The Fallow turns fully green. Future runs start with a new Folio folded from that letter, in a fresh paper stock (a cosmetic new cycle) |


All three are wins. Neither Harvest nor Sow is presented as right; Write back is the story's completion, not a better score.

## 9. Meta and post-game

- **The Fallow (hub):** grey at first. Every completed year adds a patch of green; every summit adds a grove. It shows long-term growth with no stat screens.
- **Unlocks:** new keepsakes join the find pool, peaks 2 and 3 open, and new paper **folds** (cosmetic plus one small bare-move twist each, e.g. crane fold: a longer dart) *(default)*.
- **The Herbarium:** a pressed-paper album of every landmark you have grown, with tier and peak. Completion is the collector's track.
- **Hard Winters (ascension):** 15 levels, adding information and execution pressure before raw stats (rule 19): fewer plots, earlier frost, guardians that eat a landmark, shorter Hearths.
- **Endless Years:** after the summit, autumn returns on a new face with your harvest. Score = years survived. Seeded weekly leaderboard.
- **Daily Mountain:** one seeded run per day with a leaderboard.

## 10. Launch content

| Item | Count |
|---|---|
| Peaks | 3 (Emberfell, the Glasswater, the Long White) *(default names)*, 3 faces each |
| Rooms | 9 faces × 7 rooms in rotation; authored sets of 12 per band per peak (≈ 72 rooms, each in two states) |
| Keepsakes | 24, each with 4 tiers and a landmark |
| Scrap | 8 |
| Seed-charms | 30 |
| Enemies | 18 descent, 10 climb, 6 elites |
| Bosses | 3 shared guardians + 3 peak guardians + the Magpie King |
| Modes | Run, Hard Winters 1–15, Endless Years, Daily Mountain |

Full data sheets: `discard-to-ascend-content.md`.

## 11. Art direction (summary; full rules in the art bible)

- **Layered paper theatre:** every room is 5–7 cut-paper planes with real space between them, lit by one sun and real shadows. Depth comes from light, not paint.
- **Seasons recolor the same cuts:** autumn ochre and rust, winter slate and snow caps, spring greens and petals. Season state is palette, light, particles and growth, not new geometry.
- **Pop-up engineering is the signature moment:** buried keepsakes rise as unfolding pop-up sculptures, piece by piece, with paper sound.
- **Folio is a jointed paper puppet** with hinged limbs and visible letter-writing.
- Upgrade path for the art pass: scanned real paper stocks, artist-authored vector silhouettes with torn edges, and engineered pop-ups (art bible §10).

## 12. Audio

- **Paper foley is the sound of the game:** folds, creases, rustles, tears. Flatten is a crisp fold, dart a whip of air, crumple a scrunch, a crease a dry crack. Damp mutes Folio's sounds.
- **Burial** is a soft spade and a low bell. **Bloom** is a rising pluck chord, one note per piece unfolding.
- **Music: a season-led score** (Mike, 2026-10-27). Chamber-folk palette: music box, solo cello, felt piano, fiddle and hurdy-gurdy. One composed track per band and season on each peak (autumn, winter, thaw, bloom), crossfading through **the turn**, a composed bridge cue played as the snow melts. Autumn is warm and moving, winter sparse and slow, thaw hesitant, bloom full. Guardians, the Magpie, Hearths, the Fallow, title and endings have their own cues. The full cue sheet is in `discard-to-ascend-production.md` §4.
- **Semantic events:** `item.pickup`, `item.drop`, `item.bury`, `plot.rot`, `landmark.rise`, `landmark.harvest`, `verb.use`, `verb.hit`, `crease.take`, `crease.mend`, `paper.damp`, `paper.dry`, `paper.burn`, `move.flatten`, `move.dart`, `move.crumple`, `season.turn`, `guardian.phase`, `hearth.rest`, `ui.confirm`. Asset choice and buses live in the audio layer (rule 17). Every cue has a visual equivalent (rule 9).

## 13. Tech plan

- **Full Shell fit, module map, input actions and verification:** `discard-to-ascend-production.md` §1.
- **Frames:** the Shell's `platformer` and `character-action` assemblies composed (as Preserve uses the platformer frame), with `checkpoints` (room entry), `inventory` (the pack), `progression` (unlocks, Hard Winters, Fallow growth), `results`, `leaderboards` (Daily Mountain, Endless Years), `replay` and `training` (room practice), plus `DeterministicRNG` and `SaveManager`.
- **Renderer:** Three.js through the Shell's `three` adapter, in the game repo only (the Shell stays renderer-neutral). Gameplay is an authoritative 2D collision world; the paper layers are presentation (rule 6). Promote the look test's layer builder, snow caps, season blend and pop-up unfolding rather than rewriting them (rule 5).
- **New module: `SeasonPlots`.** Pure, renderer-free rules: plots, burial, growth tiers (keepsake tier + band bonus + charm modifiers), rot, landmark generation data (tier → size class and collision footprint), harvest, replanting across years, and the save state of a face. Emits `item.bury`, `landmark.rise`, `landmark.harvest`. Portable to C# or GDScript. Likely reuse: **Graceful Charity** (gifts that grow into the world), **Graverobber** (what's left behind).
- **New module: `VerbKit`.** Keepsake definitions and tiers, the three-slot pack, verb timing, pair detection (two verbs within 80 ms) and pair moves, and paper-stock damage resolution. Emits `verb.use`, `verb.hit`, `pair.use`.
- **Collision:** an authoritative tile grid with 45° and 22.5° slope tiles, fixed-step 120 Hz simulation started from Preserve's movement code (tech reuse), paper art drawn over it.
- **Rooms:** each room is authored as one data file with two layers, `descent` and `spring`, sharing plot positions. Spring adds meltwater, vines, mud and the landmark sockets. A headless **climb bot** in CI checks that every room's bare route is clearable in spring with zero landmarks, and that every landmark socket is reachable.
- **Saves:** the run auto-saves at every room entry (resume anywhere); meta (Fallow, unlocks, Herbarium, Hard Winters) goes through Shell persistence with schema versioning from day one (rule 20).
- **Performance:** the worst case is a bloom-band room with 3 tier IV landmarks, 200 petals, damp shader on Folio and real shadows on 7 layers on a mid-range phone (rule 14). Particles are instanced, snow caps are prebuilt per level (as in the look test), and quality tiers drop shadow resolution and layer count first (art bible §9).

## 14. Platforms, price and release *(defaults, matching the other handoffs)*

1. **Web launch on itch.io**, with Emberfell Year 1 as a free demo on web portals.
2. **Steam plus iOS/Android together**, through the shared native wrapper chosen once for every game.

Price defaults: **$14.99 on Steam, $7.99 premium on mobile, $12.99 on itch.**

## 15. Open decisions

1. Names: Folio, the Fallow, the peaks, guardians and the Magpie King.
2. Local co-op (a second paper figure, shared plots)? Natural fit, not in launch scope.
3. Whether Endless Years ships at launch or as the first update.

## 16. Before launch

- Trademark search on *Perennial* (it's a common word; a subtitle may be needed).
- Check against **Seasons After Fall** (season-switching platformer) that our seasons read as run progress driven by your burials, not a switch tool.
- Tune every default in playtests (`discard-to-ascend-tuning.md`) and keep the climb bot green in CI.

## 17. Build milestones to shelf

1. **Core (M1):** one face of Emberfell (4 autumn + 3 winter rooms, both states), Folio's bare moves, 4 keepsakes (Ember Blade, Bramble Shield, Hook, Lantern) and 2 scrap, plots, growth, rot, the season turn, landmarks and harvest, the Drift Wolf, and the full Shell loop. Promote the look test's renderer. **Playtest one question before more content: does burying the blade before the wolf feel like a real sacrifice, and does climbing the Sunblade feel like the payoff?**
2. **One full run:** Emberfell's three faces, replanting, Hearths, 12 keepsakes, the three shared guardians, the Magpie King and both endings. This is the portal demo (Year 1).
3. **Peaks 2 and 3:** the Glasswater and the Long White, their peak guardians, all 24 keepsakes, 30 seed-charms.
4. **Meta:** the Fallow's growth, folds, the Herbarium, Hard Winters.
5. **Modes:** Daily Mountain, Endless Years.
6. **Art pass:** scanned paper stocks, authored silhouettes, engineered pop-ups, puppet animation (art bible §10).
7. **Release readiness:** the Shell's release-readiness pass in full.

## 18. Companion docs

- `discard-to-ascend-content.md`: keepsakes and tiers, landmarks, scrap, seed-charms, enemies, guardians, peaks, with semantic IDs.
- `discard-to-ascend-onboarding.md`: the first run, room by room.
- `discard-to-ascend-tuning.md`: movement, growth, combat and boss numbers, and the climb bot.
- `discard-to-ascend-production.md`: Shell fit and module map, storyboards, asset list, audio cue sheet (27 music cues), screens and flows, save format.
- `discard-to-ascend-art-bible.md`: paper rules, palettes, Folio, pop-ups, light, UI, performance and the art-pass upgrade path.

## Market check (2026-10-27, from knowledge, not a fresh search)

- **Tearaway**, **Paper Mario: The Origami King** and **Lumino City** prove paper worlds sell on charm; none is a roguelite.
- **Seasons After Fall** switches seasons as a platforming tool; **Unravel** spends the hero's body as rope. Neither uses seasons as the turn between giving and receiving.
- **Dead Cells** and **Rogue Legacy** set the side-view roguelite structure; **Spelunky** sets room-shuffled traversal.
- No known roguelite makes you **bury your gear to build the return path**, so the core loop is uncommon.
