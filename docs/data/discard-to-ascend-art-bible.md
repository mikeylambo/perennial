# Discard to Ascend / Perennial: Art Bible and Style-Frame Brief

Reference: the look test (https://claude.ai/artifact/Qd5QectGotx8MTKEPT4fz1, source `prototypes/discard-to-ascend-paper-test.html`). It establishes the method (layered slabs, real shadows, season blend, pop-ups). This bible sets the rules the full game and the later art pass follow.

**One sentence:** a lit pop-up book of a mountain, where every surface is real paper and every change of season is light, color and growth on the same cuts.

## 1. Pillars

1. **Everything is paper.** World, hero, enemies, UI, particles. No painted gradients standing in for paper, no glow that paper couldn't make.
2. **Depth comes from light.** Five to seven planes with real space between them, one sun, real cast shadows. Shadow between layers is the main depth cue.
3. **Seasons recolor, they don't rebuild.** Autumn, winter and spring share geometry. Change comes from palette, light, snow caps, particles and growth.
4. **Growth is engineered.** Pop-ups unfold like real paper mechanisms: hinged pieces, V-folds, layered fronts. Never a scale-up or a fade.
5. **Readable first.** Gameplay planes are always the highest contrast in frame; far planes desaturate into fog.

## 2. Palette (per season; the look test's values are the starting point)

| Plane | Autumn | Winter | Spring |
|---|---|---|---|
| Sky top / horizon | `#e39b62` / `#f7d9a8` | `#9fb2c6` / `#e2e8ee` | `#86c0d3` / `#eef3dc` |
| Far ridge | `#c98a5c` | `#a9b7c6` | `#93b9b3` |
| Mid hills | `#b8693f` / `#9b4a2b` | `#8fa1b4` / `#76889d` | `#79a873` / `#5b9150` |
| Gameplay ground | `#6e351f` | `#5b6979` | `#446f35` |
| Foreground frame | `#3d1f15` | `#2f3a47` | `#2b4a26` |
| Snow caps | — | `#f4f7fa` | melting |
| Accent | Folio's scarf vermilion `#c8572a` | same | same |

**Peaks tilt the palette:** Emberfell warm (as above), the Glasswater toward teal and slate, the Long White toward blue-white with black rock. **Folio's scarf is the only constant accent** across all seasons, so the hero always reads.

## 3. Folio

- A **jointed paper puppet**: head, torso, two arms, two legs, cloak, each a separate cut with a visible hinge (a brad or a fold). Animation is puppet rotation at hinges plus a few swapped cuts (flattened, dart, crumpled ball), the way paper theatre works.
- **Body paper:** off-white letter stock with faint handwriting in sepia that shows through when backlit (sun behind Folio, lanterns).
- **Creases are visible:** each crease adds a fold-line normal map and a slight bend; at 1 crease Folio is visibly battered.
- **Damp:** darker, translucent, slightly sagging; drops fall off it.
- **Pack:** the three keepsakes hang on Folio's back as small cut-paper icons, so the loadout reads in play.

## 4. Camera and scale

- Side-view, perspective camera with a low field of view (≈ 32°) so planes keep parallax without distortion.
- Folio is about 1/14 of screen height on desktop, 1/10 on phones (portrait shows less width, more height for climbs).
- The camera leads in the direction of travel: downward on the descent, upward on the climb (the climb frames more sky).

## 5. Plots and landmarks

- **Plots:** a dark soil oval with a stake and a red flag. Winter plots have a **two-leaf mark** cut into the stake (shape, not color, rule 9).
- **Burial:** the item drops in, soil folds over it as a small mound. Snow covers mounds in winter.
- **Landmarks** are pop-up sculptures with 4–12 pieces each, built from flat cuts on hinges: a back piece, mid pieces with V-folds angled ±15–20°, front pieces. Rise order goes from base to crown. T4 landmarks add one moving part (a turning windmill, a ringing bell, a lit beacon).
- **Climbable surfaces on a landmark are lighter paper with a deckled edge**, so they read as ledges at a glance.
- **Rot:** scrap mounds turn grey, sag and leave a small grey stump.

## 6. Room kit

- Each band has a **cut kit**: ridge silhouettes, trees (trunk, two canopy cuts, bare branches), rocks, fences, shrines, stashes, Hearth.
- **Snow caps** are separate white strips along each plane's top edge, built in steps (look test: 9 levels).
- **Spring dressing:** grass tufts, flowers (5-petal cuts with a center disc), vines, puddles (a glossy paper layer).
- **Particles:** leaves (ellipse cuts, autumn colors), snow (small round cuts), petals (pale pink, cream, yellow). Always instanced.

## 7. Light per season

| Season | Sun | Shadow | Mood |
|---|---|---|---|
| Autumn | Low, warm `#ffb36b`, from upper left | Long, soft | Golden hour |
| Winter | High, cool `#dfe8ff`, dim | Short, hard | Hushed, sparse |
| Spring | High, warm-white `#fff1d2` | Medium, crisp | Bright, busy |
| Guardian floors | One strong key light, rest dark | Hard | Stage spotlight |
| Hearth | Firelight from below | Upward shadows | Warm, safe |

Lanterns and the Sunblade are real point lights that backlight nearby paper.

## 8. UI

- All UI is **paper tags**: off-white card with a hard 2–3 px offset shadow and slight rotation (as in the look test's HUD).
- Type: a warm display serif for titles (look test used Young Serif) and a clean humanist sans for labels (Karla). Minimal player-facing copy (rule 8).
- Pack slots are three cut-paper tabs at the bottom; the verb glyph is the keepsake's silhouette.

## 9. Performance tiers (presentation only)

| Tier | Shadows | Planes | Particles | Extras |
|---|---|---|---|---|
| Low | 1024, hard | 4 | 80 | No bump map |
| Medium *(default)* | 2048, soft | 6 | 200 | Bump map, sun disc |
| High | 4096, soft | 7 | 300 | Backlit translucency on Folio, depth of field |

**Target a locked 60 fps on a mid-range laptop with other apps open before adding fidelity** (the Preserve lesson: smoothness beats fidelity for feel).

## 10. The art pass (upgrade path from the look test)

The look test is method, not finish. The art pass makes four upgrades, in order of impact per cost:

1. **Real paper stocks (cheapest big jump).** Scan or photograph 10–15 real papers: watercolor, cold-press, kraft, washi, card stock, tissue, letter paper. Watercolor washes painted on paper are welcome here; it's the one place painting belongs. Replace the generated grain.
2. **Authored silhouettes (biggest jump).** An artist cuts every ridge, tree and rock in a vector tool, with torn and deckled edges and a thin white paper core showing at each cut edge. Code places them; it doesn't draw them.
3. **Lighting (code).** Translucency where light passes through thin paper, contact shadows where planes touch, depth of field on the far and near planes, a slow sun arc across a year.
4. **Puppet and pop-ups.** Folio as a fully hinged puppet with authored poses, and every landmark fold-engineered and test-assembled in paper (a physical pop-up test for the 4 hero landmarks is worth doing).

## 11. Style-frame brief (first visual target)

One frame, 16:9: **Emberfell, Year 1 climb, the bloom band.** Folio (damp, two creases) stands on the crossguard of a T3 Sunblade tree that has just finished unfolding, holding up the bloom. Below, the same slope seen on the descent in autumn is now green with flowers; a stump marks where a nail rotted. Far planes show the Glasswater in mist. Sun low behind the Sunblade, backlighting Folio's handwriting. HUD: three paper tabs, one empty.
