# Decisions

Seeded from GDD §47; builder assumptions follow (GDD §44 rule 10).

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

## Phase 0 builder assumptions (2026-10-28)
| Decision | Reason | Revisit |
|---|---|---|
| Pipeline Triage Score skipped | `TRIAGE.md` / `REUSE_MAP.md` don't exist (GDD §46 default) | If they turn up |
| The face is one continuous world; rooms are vertical slices aligned by entry/exit rows | Lets the camera pull up the whole face at the turn and the climb run without loads | Phase 1 `RoomLoader` |
| Room grids live in TypeScript, not JSON | Typechecked, one import, comments for the legend | When a room tool exists |
| Slopes are 45° only | Readable at a glance, simple collision; enough for crumple | Phase 5 |
| Bare spring routes are "return bridge" detours; landmark routes are shorter | Law: every climb is finishable bare, but growth must pay | Playtest |
| Bare offense is stomp + crumple | Folio needs a way to clear threats with an empty pack | Playtest |
| Interact: tap E (or Up) takes a find or bloom; hold E buries; hold E at a find with a full pack swaps | Keeps bury deliberate and off the attack keys (GDD §8 hand split) | — |
| Finds respawn each year unless Folio already carries that keepsake | Every year has something to give without duplicates | Phase 2 |
| The Drift Wolf is the guardian all three years at 30/45/60 HP | Phase 0 has one guardian; pressure rises per year | Phase 2 guardians |
| Wolf and wolflings use the plain stock | Felt made stomps too weak to finish the fight bare | Stocks pass (Phase 3) |
| Passive air drying of damp, faster near heat | Damp shouldn't strand a player away from braziers | Playtest |
| Folio height 0.9 tiles | Fits one-tile gaps standing; flat (0.25) for low roots | — |
| The lantern flare burns thorns | Gives the tend family a route verb in Phase 0 | Pairs in Phase 2 |
| Pairs, charms, the Fallow hub and meta deferred | Phase 0 scope (GDD §40) | Phase 2 |
| Burr Slope's 2-tile block lowered to 1 | Climb bot: a 2-tile wall off a slope exceeded the bare jump (2.2 tiles) | — |
| Three r155+ light units: sun/hemi/point intensities × π vs the r128 look test | Matches the approved look test's exposure | Art pass |
| Runtime auto-quality steps down (high → medium → low) after 3 s of slow frames; never saved | Phones keep frame rate without a settings visit | Perf pass |
| Keyboard taps shorter than a frame are latched for one frame | A quick tap must never be lost (menus and jump) | — |
