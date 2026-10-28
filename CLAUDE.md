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

## Where things live
- `src/data/tuning.ts`: every number (the one tuning file). `src/data/content.ts`: keepsakes, scrap, enemies, the letter.
- `src/data/rooms/emberfell.ts`: room grids (legend at the top). Rooms stack into one continuous face.
- `src/sim/`: renderer-free simulation. `sim.ts` owns phases and emits semantic events; `body.ts` is Folio's
  paper movement; `seasonPlots.ts` and `verbKit.ts` are the pure modules.
- `src/render/`: the paper renderer (reads sim state + events only). `src/ui/`: input, HUD, screens. `src/audio/`: synth.
- `vendor/slu-web-shell/`: the vendored Shell build (pinned in its package.json description). Do not edit; re-vendor.

## Checks
- `npm test`: unit + sim invariants. `npm run climb-check`: the climb bot on the real movement code
  (descent bare; spring climb with zero landmarks and no thorns). `npm run smoke`: Playwright through every
  screen on keyboard, emulated gamepad and emulated touch. `npm run gates`: all of it plus the build.
- Debug URL flags: `?play` skip title, `?pack=blade:2,hook:1`, `?room=5`, `?god`, `?seed=7`,
  `?quality=low|medium|high`, `?step` (manual stepping via `window.__GAME.step(n, input)`).
