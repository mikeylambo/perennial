# Discard to Ascend / Perennial: Content Data Sheets

Launch data for the builder. Every entry has a semantic ID used by save data, telemetry and the `SeasonPlots` module. Names are *(default)* throughout. Numbers live in `discard-to-ascend-tuning.md`.

## 1. Keepsakes (24)

Each keepsake is one verb with four tiers. **T1** is the found form. T2–T4 come only from growth (burial) and are harvested from the top of the landmark. The landmark's size class follows tier: T2 ledge, T3 tower, T4 mythic. (A T1 burial can't happen: burying always grows at least one tier.)

### Strike
| ID | T1 (found) | Verb | T2 | T3 | T4 | Landmark (climb effect) |
|---|---|---|---|---|---|---|
| `ks.blade` | Ember Blade | 3-hit slash | Sunblade | Daybreak | Noonfire | **Sunblade tree:** crossguard branches to climb; melts snow and dries Folio within 4 tiles |
| `ks.spear` | Reed Spear | Thrust; down-thrust pogo | Cattail Lance | Riverspear | Monsoon | **Reed stand:** springy stalks that bounce Folio upward |
| `ks.hammer` | Stone Mallet | Slow smash; breaks ice and armor | Quarry Maul | Mountainheart | Bedrock | **Cairn:** a stacked tower; its top stone is a stomp plate that shakes enemies off the room |
| `ks.sling` | Pebble Sling | Ranged shot, arcing | Hailsling | Stormsling | Thunderhead | **Slingshot elm:** a forked tree that launches Folio across gaps |
| `ks.sickle` | Harvest Sickle | Wide sweep; cuts vines and thorns | Crescent | Moonreaper | Eclipse | **Wheat wall:** tall grain you climb as rungs; hides you from fliers |
| `ks.fan` | Paper Fan | Gust that pushes enemies and projectiles | Wind Fan | Gale Fan | Zephyr | **Windmill:** a pop-up mill whose updraft carries a gliding Folio high |

### Guard
| ID | T1 | Verb | T2 | T3 | T4 | Landmark |
|---|---|---|---|---|---|---|
| `ks.shield` | Bramble Shield | Block; tap at impact to parry | Thorn Bastion | Briar Keep | Rosewall | **Thorn hedge:** cover from fliers; berries mend 1 crease once per year |
| `ks.cloak` | Moth Cloak | Phase dodge through attacks | Dusk Cloak | Nightveil | Starmantle | **Moth tree:** a tree of paper moths that lifts Folio while you hold glide under it |
| `ks.bell` | Tin Bell | Ring: stuns everything nearby | Chapel Bell | Great Bell | Morning Bell | **Belltower:** ring it to stun every enemy in the room once |
| `ks.umbrella` | Oilcloth Umbrella | Blocks above; a parachute in air | Waxed Canopy | Tent | Sky Pavilion | **Pavilion:** dry shelter from meltwater rain; a high resting platform |

### Move
| ID | T1 | Verb | T2 | T3 | T4 | Landmark |
|---|---|---|---|---|---|---|
| `ks.hook` | Fish Hook | Grapple and swing | Anchor Hook | Grapnel | Skyline | **Hook pine:** branches every 3 tiles that act as grapple points |
| `ks.crampons` | Iron Crampons | Cling to walls and ice | Spurs | Wallwalkers | Cliffkeepers | **Ivy face:** a climbable wall of leaves |
| `ks.kite` | Kite String | Tether to wind: long rising glide | Box Kite | Dragon Kite | Sky Serpent | **Kite post:** a pole flying a kite that tows Folio upward |
| `ks.boots` | Spring Boots | Second jump | Hare Boots | Stag Boots | Cloudstep | **Mushroom ring:** bouncy caps, higher each tier |
| `ks.rope` | Climbing Rope | Throw a rope line to any ledge in reach | Knotted Line | Rigging | Ropebridge | **Rope bridge:** spans the room's widest gap |
| `ks.ladder` | Folding Ladder | Place a short ladder anywhere | Step Tower | Siege Ladder | Stairway | **Stair tree:** a spiral of shelf fungus up a trunk |

### Tend
| ID | T1 | Verb | T2 | T3 | T4 | Landmark |
|---|---|---|---|---|---|---|
| `ks.lantern` | Tallow Lantern | Light: reveals stashes and hidden ledges; burns thorns (fire risk) | Hearth Lantern | Beacon | Lighthouse | **Beacon:** a lit tower; dries and warms, reveals every stash in the room |
| `ks.needle` | Sewing Needle | Stitch: mend 1 crease (3 charges per year) | Darning Needle | Tailor's Kit | Weaver | **Loom tree:** a full mend at its top, once |
| `ks.bellows` | Bellows | Puff: dries Folio, fans fire, blows enemies back | Forge Bellows | Wind Organ | Breath | **Organ pipes:** vents that launch Folio up in sequence |
| `ks.seedbag` | Seed Bag | Throw a seed: grows a 1-tile step for 10 s | Sprout Bag | Grove Bag | Garden | **Orchard:** fruit trees that are steps and mend 1 crease |
| `ks.flint` | Flint and Steel | Spark: lights fires, big damage, burns Folio if close | Torch | Brazier | Bonfire | **Bonfire pyre:** a wide warm zone; enemies avoid it |
| `ks.compass` | Brass Compass | Shows nearest plot and stash; timing slow-mo on parry | Navigator | Astrolabe | Pole Star | **Waystone:** a fast route marker; opens a shortcut room |
| `ks.mirror` | Hand Mirror | Reflects a projectile | Silver Mirror | Moon Pool | Still Lake | **Moon pool:** a reflecting pond that bounces Folio high |
| `ks.whistle` | Bird Whistle | Calls a paper sparrow to peck one target | Finch Call | Crow Call | Murmuration | **Rookery:** birds that carry Folio one screen up when called |

**Unlocks** *(default)*: 12 keepsakes are in the pool at first launch (Ember Blade, Reed Spear, Pebble Sling, Bramble Shield, Moth Cloak, Fish Hook, Spring Boots, Climbing Rope, Tallow Lantern, Sewing Needle, Seed Bag, Paper Fan). The other 12 unlock through Fallow growth and summits.

## 2. Scrap (8)

All rot into a **stump** (a 1-tile foothold). IDs `scrap.*`: Bent Nail, Cracked Cup, Lost Button, Odd Mitten, Broken Comb, Thimble, Tin Spoon, Spent Candle. The Spent Candle's stump stays faintly lit (a tiny warm zone): the only scrap with a perk.

## 3. Seed-charms (30)

Run-long passives, one chosen from three at each Hearth and some stashes. IDs `charm.*`.

| Charm | Effect |
|---|---|
| Deep Roots | Autumn plots also grow two tiers |
| Late Frost | Winter plots grow three tiers; you start each guardian with one fewer crease |
| Wild Graft | Each landmark gets a random second landmark effect |
| Compost | Scrap rots into a T2 ledge instead of a stump |
| Patient Soil | Items you carry through a whole year without using grow one tier at the Hearth |
| First Fruit | The first harvest each year comes back one extra tier |
| Twin Seed | Your first burial each year also plants a copy in the next plot down (needs an empty plot) |
| Rain Dancer | Damp no longer slows you; you're immune to meltwater |
| Paperweight | Wind doesn't push you; dart glide is shorter |
| Waxed Paper | Fire deals normal damage instead of double |
| Hollow Pack | A fourth slot, but slot 4 can only hold scrap |
| Grateful Dead | When a guardian dies, every rotting scrap on the face becomes a T2 ledge |
| Root Memory | Landmarks from last year leave a T1 sprout in the same plots |
| Generous | Burying a keepsake mends 1 crease |
| Miser's Lock | Your slot 1 item can't be stolen or broken (anti-Magpie) |
| Thawed Heart | The season turns 30% earlier on the climb: less snow, more mud |
| Sharp Folds | Flatten deals damage to anything it passes under |
| Crumple Armor | No creases taken while rolling |
| Long Dart | Dart glide lasts 50% longer |
| Kindred Leaf | Landmarks of the same family grown in one year link with vines you can climb between |
| Spring Fever | Enemies on the climb are 25% slower for the first 10 s of each room |
| Hearthbound | Hearths also offer one free tier-up on a carried keepsake |
| Bare Faith | While your pack is empty, take half damage and bare moves deal triple |
| Heavy Harvest | Harvested keepsakes come back +1 tier, but you can only harvest two per year |
| Stubborn Seed | One plot per year can't be eaten by guardians or the Magpie |
| Night Bloom | Landmarks give off light: winter-band rooms on the next descent are fully visible |
| Echo Bell | Every landmark rings when it rises: stuns enemies on screen |
| Old Letter | Each unsent letter scrap found reveals one hidden stash per year |
| Gardener's Eye | Plots show the exact tier a carried item would grow to |
| Perennial | The tallest landmark you grow in a run is pressed into the Herbarium as a gold leaf (cosmetic; the collector's charm) |

## 4. Enemies

Paper creatures, cut and folded. Tells are fold, flutter or crease motions before attacks (rule 9). IDs `en.*`.

### Descent (autumn and winter, 18)
| Enemy | Band | Behavior |
|---|---|---|
| Leaf Mite | Autumn | Swarms; dies to one hit or a crumple |
| Acorn Jay | Autumn | Steals scrap from your pack if it touches you |
| Bark Beetle | Autumn | Armored front; must be hit from behind or smashed |
| Gourd Hob | Autumn | Rolls downhill at you; outrun it or flatten under |
| Chestnut Burr | Autumn | Spiky hazard creature that bounces |
| Rook | Autumn | Dives in a telegraphed arc |
| Fox Paper | Autumn | Fast; feints once before lunging |
| Hedge Sprite | Autumn | Throws burrs from cover |
| Frost Moth | Winter | Its dust makes you damp |
| Snow Hare | Winter | Leaps in pairs; kicks you off ledges |
| Icicle Bat | Winter | Hangs as an icicle; drops when you pass |
| Drift Lurker | Winter | Hides in snow banks; only the lantern or compass shows it |
| Rime Crab | Winter | Shell breaks only to a hammer or fire |
| Sleet Wisp | Winter | Floats; projectiles that soak |
| Ice Ram | Winter | Charges and shatters ledges |
| White Stoat | Winter | Steals a keepsake and runs downhill; catch it before the guardian |
| Frozen Wolfling | Winter | Pack hunter; howls call the next room's pack early |
| Snow Golem | Winter (elite) | Big, slow; throws snowballs that crumple you |

### Climb (spring, 10)
| Enemy | Behavior |
|---|---|
| Mudling | Splits on death; slows you |
| Hornet | Fast flier; dodges; hedges block it |
| Thorn Snake | Wraps around landmarks; must be cut off before you climb |
| Thaw Toad | Leaps from meltwater; splashes make you damp |
| Bud Spider | Hangs from blossoms; webs slow your climb |
| Sap Slug | Leaves sticky trails on ledges |
| Rainspirit | Rains on one area; dries only near fire |
| Gnaw Vole | Chews landmark roots: a landmark shrinks one size if left alone 10 s |
| Bloom Wasp Queen | Elite; spawns hornets |
| Weed King | Elite; strangles a landmark, removing it this climb unless killed |

### Elites (6)
Snow Golem, Bloom Wasp Queen, Weed King, plus **Sleet Matron** (winter), **Old Badger** (autumn: digs up your plots unless driven off) and **Rime Knight** (winter: a paper knight with a parry you must bait).

## 5. Guardians and the final boss

| ID | Guardian | Where | Pattern |
|---|---|---|---|
| `boss.driftwolf` | The Drift Wolf | Year 1, every peak | Circles in the snow, lunges with a paper-crease tell; howls to bury the arena edges in drift (damp zones). Phase 2 splits into three wolflings |
| `boss.stag` | The Icefall Stag | Year 2, every peak | Antlers of icicles; charges that shatter the floor into falling floes; a frozen waterfall wall it can melt into |
| `boss.longnight` | The Long Night | Year 3, every peak | A vast snow owl; dims the arena; silent dives you track by falling feathers; only light verbs reveal its body |
| `boss.emberfell` | The Kiln Bear | Emberfell (replaces the Stag) | Wakes from hibernation hot: fire attacks threaten paper, but it thaws the arena |
| `boss.glasswater` | The Pike Under Ice | Glasswater (replaces the Wolf) | Fights from beneath the ice; you break holes to make it surface |
| `boss.longwhite` | The Avalanche | Long White (replaces the Owl) | A moving wall of snow; the fight is a chase down a collapsing face |
| `boss.magpie` | The Magpie King | Summit, Year 3 | Steals pack items and uses them; phase 2 flies above reach of all but your tallest landmark (main spec §8) |

## 6. Peaks

| ID | Peak | Palette tilt | Signature |
|---|---|---|---|
| `peak.emberfell` | Emberfell | Rust, ochre, warm grey | Orchards and terraced fields; gentle; the first peak |
| `peak.glasswater` | The Glasswater | Teal, slate, white | Lakes and frozen falls; ice physics and water routes |
| `peak.longwhite` | The Long White | Blue-white, black rock | Wind and avalanches; the hardest climbs; few plots, high growth |

## 7. Rules precedence (edge cases)

1. A plot's growth = keepsake tier + band bonus (autumn +1, winter +2) + charm modifiers, capped at T4. Overflow past T4 becomes a **seed** that adds +1 to the next burial.
2. If the run ends, all plots are lost; harvested keepsakes in the pack are lost too, except those saved by the Harvest ending.
3. An item stolen by an enemy and not recovered by the guardian's death is gone for the year; if the thief dies, it drops the item.
4. A landmark eaten or shrunk this climb still yields its bloom if you reach its top.
5. Bare route guarantee: every spring room is clearable with zero landmarks (climb bot, CI).

## 8. The letter (12 lines)

Revealed one line per completed year, in this order. Handwritten on Folio's body; shown on the Hearth plate. Final copy is *(default)* and should get a writer's pass, but keep it this short.

1. To whoever plants after me,
2. I don't know your name. I've stopped needing to.
3. This valley was green when I was young. I spent it.
4. I kept the best seed back, for a better year. It never came.
5. So I'm sending you what I should have sown.
6. It will feel like losing. Plant it anyway.
7. The cold will ask what you kept. Answer honestly.
8. Spring never asks. It only answers.
9. I won't see what you grow. That was always the point.
10. When your hands are empty, you'll be ready.
11. Then write to whoever comes after you.
12. — the last gardener of the Fallow

Semantic IDs: `letter.line.01` to `letter.line.12`; `ending.writeback` unlocks when all 12 are read.

## 9. Verb pairs

A pair move fires when two verbs are pressed together. It is defined by the two **families**; each keepsake adds the flavor in brackets. Pair tier = the lower of the two keepsakes' tiers. IDs `pair.<family>.<family>`.

| Pair | Move | Examples |
|---|---|---|
| Strike + Strike | **Flurry:** alternate both weapons in a fast 5-hit chain ending in a launcher | blade + spear: cross-cut into a rising thrust |
| Strike + Guard | **Riposte:** a parry stance; a successful parry auto-counters with the strike at double damage | blade + shield (the classic), sickle + umbrella: spinning counter |
| Strike + Move | **Swoop:** the move verb carries the strike | hook + blade: swinging slash; boots + hammer: aerial ground-pound; crampons + spear: wall-dive |
| Strike + Tend | **Imbue:** the tend verb's element coats the strike for 6 s | lantern/flint + blade: fire edge; bellows + sling: wind shot; needle + spear: pins enemies to walls |
| Guard + Guard | **Bulwark:** an all-round block that reflects projectiles | shield + umbrella: dome; cloak + bell: ringing phase |
| Guard + Move | **Ram:** a shielded dash through enemies | shield + boots: bounding charge; umbrella + kite: storm glide |
| Guard + Tend | **Ward:** a protective field for 4 s | shield + bell: shockwave parry; umbrella + lantern: warm dry dome |
| Move + Move | **Traverse:** chained movement | hook + boots: swing into a high double jump; rope + ladder: instant bridge |
| Move + Tend | **Scatter:** the tend verb fires along the movement path | kite + seed bag: sow steps while gliding; hook + lantern: light every grapple point |
| Tend + Tend | **Rite:** the two utilities combine | lantern + bellows: fire gust; needle + seed bag: mend sprout (2 creases); compass + mirror: reveal and reflect all |

Fan (`ks.fan`) counts as strike for pairs but pairs with fire tend verbs as a gust.

## 10. Paper stocks and damage

| Stock | Read (texture, motion, sound) | Cut | Blunt | Fire | Wind | Damp |
|---|---|---|---|---|---|---|
| Tissue | Translucent, flutters, rustles | ×2 | ×1 | ×2 | Thrown | Sticks (stunned) |
| Card | Stiff, sharp corners, thuds | ×0.5 front | ×1.5 | ×1 | Immune | Sags (slower) |
| Wax | Glossy, sheen moves, squeaks | ×1 | ×1 | ×3 | ×1 | Immune |
| Foil | Glints, crinkles | ×0.5 | ×2 (crumples) | Reflected | ×1 | Immune |
| Felt | Fuzzy edge, silent | ×1.5 | ×0.25 | ×1.5 | ×0.5 | Heavy (slow) |

Every enemy in §4 has one stock (elites two, guardians one per phase). Folio is letter paper: tissue-like for fire and wind, card-like for nothing.
