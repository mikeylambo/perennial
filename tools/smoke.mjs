// End-to-end smoke (GDD §41): drives the real build through every screen on keyboard, an emulated gamepad
// and emulated touch. Fails if any screen has no way forward or the page throws. Run after `vite build`.
import { createRequire } from "node:module";
import { preview } from "vite";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  ({ chromium } = require("playwright"));
}

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: "silent" });
const base = "http://localhost:4179/?quality=low&seed=7";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? "  ok" : "  FAIL"} ${msg}`);
  if (!ok) failures.push(msg);
};

async function page(opts = {}, init) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, ...opts });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.errors = errors;
  return p;
}
const state = (p) => p.evaluate(() => { const g = window.__GAME; return { mode: g.mode, screen: g.screen, phase: g.sim.phase, year: g.sim.year, x: g.sim.body.x, y: g.sim.body.y, pack: g.sim.pack.slots.filter(Boolean).length }; });
// Menus read input once per rendered frame, and a software GPU renders about one frame a second here.
const press = async (p, key) => {
  await p.keyboard.press(key);
  await p.waitForTimeout(1300);
};
const until = (p, fn, arg, ms = 60000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 200 });

try {
  // ---------------------------------------------------------------- keyboard: the whole flow
  console.log("keyboard");
  const p = await page();
  await p.goto(base);
  await until(p, () => window.__GAME && window.__GAME.screen === "title");
  check(true, "title shows");
  await p.waitForTimeout(400);
  await press(p, "Enter");
  await until(p, () => window.__GAME.mode === "play");
  check(true, "Enter on Begin starts a run");
  const x0 = (await state(p)).x;
  await p.keyboard.down("KeyD");
  await until(p, (x) => window.__GAME.sim.body.x > x + 1.5, x0, 30000).catch(() => {});
  await p.keyboard.up("KeyD");
  check((await state(p)).x > x0 + 1.5, "holding D runs right");
  // Pick up the first find, bury it, go to the guardian, win, the turn, harvest, the Hearth.
  const r = await p.evaluate(() => {
    const g = window.__GAME, sim = g.sim, w = sim.world;
    const stand = (x, y) => { sim.body.x = x; sim.body.y = y + 0.05; sim.body.vx = sim.body.vy = 0; g.step(30); };
    const out = {};
    const f = w.finds.find((q) => q.item.startsWith("ks."));
    sim.enemies = [];
    stand(f.x - 0.2, f.y);
    g.step(1, { act: true }); g.step(3);
    out.picked = sim.pack.slots.filter(Boolean).length;
    const plot = w.plots.find((q) => q.band === "winter");
    stand(plot.cx + 0.5, plot.cy);
    g.step(70, { act: true }); g.step(5);
    out.buried = sim.stats.burials.length;
    sim.warp(w.rooms.length - 1);
    stand(sim.floor.x0 + 6, w.guardian.y);
    g.step(20, { x: 1 });
    out.guardian = sim.phase;
    for (let k = 0; k < 10 && sim.wolfParts.length; k++) { for (const e of sim.wolfParts) sim.hurtEnemy(e, 999, "cut", true, 4, 1); g.step(20); }
    out.turn = sim.phase;
    g.step(Math.ceil(sim.turnLength * 120) + 5);
    out.climb = sim.phase;
    const lm = sim.landmarks[0];
    stand(lm.harvestX, lm.top);
    g.step(1, { act: true }); g.step(3);
    out.harvested = sim.stats.harvests.length;
    const h = w.rooms[0];
    stand(h.x1 - 6, w.hearth.y);
    g.step(5);
    out.hearth = sim.phase;
    return out;
  });
  check(r.picked === 1, "tap E takes a keepsake");
  check(r.buried === 1, "hold E buries it");
  check(r.guardian === "guardian", "the Drift Floor starts the guardian");
  check(r.turn === "turn" && r.climb === "climb", "the guardian falls, the turn plays, the climb begins");
  check(r.harvested === 1, "the landmark's bloom harvests");
  check(r.hearth === "hearth", "reaching the top is the Hearth");
  await until(p, () => window.__GAME.screen === "hearth");
  check(true, "the Hearth screen opens with the letter");
  await p.waitForTimeout(400);
  await press(p, "Enter");
  await until(p, () => window.__GAME.mode === "play" && window.__GAME.sim.year === 2);
  check(true, "Go down again starts year 2");
  await press(p, "Escape");
  await until(p, () => window.__GAME.screen === "pause");
  check(true, "Esc pauses");
  await p.waitForTimeout(400);
  await press(p, "ArrowDown");
  await press(p, "Enter");
  await until(p, () => window.__GAME.screen === "settings");
  check(true, "settings open from pause");
  await p.waitForTimeout(400);
  await press(p, "Backspace");
  await until(p, () => window.__GAME.screen === "pause");
  await p.waitForTimeout(400);
  await press(p, "ArrowDown");
  await press(p, "ArrowDown");
  await press(p, "Enter");
  await until(p, () => window.__GAME.screen === "confirm");
  await p.waitForTimeout(400);
  await press(p, "ArrowRight"); // focus stays; use Tab-free nav
  await press(p, "ArrowDown");
  await press(p, "Enter");
  await until(p, () => window.__GAME.screen === "results");
  check(true, "abandon reaches results");
  await p.waitForTimeout(400);
  await press(p, "Enter");
  await until(p, () => window.__GAME.mode === "play" && window.__GAME.sim.year === 1);
  check(true, "Climb again starts a fresh run");
  await p.evaluate(() => window.__GAME.finish("abandon"));
  await until(p, () => window.__GAME.screen === "results");
  await p.waitForTimeout(400);
  await press(p, "ArrowDown");
  await press(p, "Enter");
  await until(p, () => window.__GAME.screen === "title");
  check(true, "results lead back to the title");
  // Death: the torn sequence ends at results.
  await press(p, "Enter");
  await until(p, () => window.__GAME.mode === "play");
  await p.evaluate(() => { const s = window.__GAME.sim; s.body.y = -3; window.__GAME.step(3); });
  await until(p, () => window.__GAME.screen === "results", null, 90000);
  check(true, "being torn ends at results");
  check(p.errors.length === 0, `no page errors (${p.errors.slice(0, 3).join(" | ")})`);
  await p.context().close();

  // ---------------------------------------------------------------- emulated gamepad
  console.log("gamepad");
  const pad = await page({}, () => {
    window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [{ id: "emulated", index: 0, connected: true, mapping: "standard", ...window.__pad }];
  });
  await pad.goto(base);
  await until(pad, () => window.__GAME && window.__GAME.screen === "title");
  await pad.waitForTimeout(400);
  await pad.evaluate(() => { window.__pad.buttons[0].pressed = true; });
  await until(pad, () => window.__GAME.mode === "play");
  await pad.evaluate(() => { window.__pad.buttons[0].pressed = false; });
  check(true, "Ⓐ on Begin starts a run");
  const px = (await state(pad)).x;
  await pad.evaluate(() => { window.__pad.axes[0] = 1; });
  await until(pad, (x) => window.__GAME.sim.body.x > x + 1.5, px, 30000).catch(() => {});
  await pad.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.buttons[9].pressed = true; });
  check((await state(pad)).x > px + 1.5, "left stick runs");
  await until(pad, () => window.__GAME.screen === "pause");
  check(true, "Start pauses");
  await pad.evaluate(() => { window.__pad.buttons[9].pressed = false; });
  check(pad.errors.length === 0, `no page errors (${pad.errors.slice(0, 3).join(" | ")})`);
  await pad.context().close();

  // ---------------------------------------------------------------- emulated touch
  console.log("touch");
  const t = await page({ hasTouch: true, isMobile: true, viewport: { width: 740, height: 360 } });
  await t.goto(base);
  await until(t, () => window.__GAME && window.__GAME.screen === "title");
  await t.waitForTimeout(400);
  await t.tap('[data-act="begin"]');
  await until(t, () => window.__GAME.mode === "play");
  check(true, "tap Begin starts a run");
  check(await t.isVisible(".t-jump"), "touch controls show");
  const ty0 = (await state(t)).y;
  const jump = await (await t.$(".t-jump")).boundingBox();
  await t.touchscreen.tap(jump.x + jump.width / 2, jump.y + jump.height / 2);
  const jumped = await until(t, (y) => window.__GAME.sim.body.y > y + 0.4, ty0, 30000).then(() => true, () => false);
  check(jumped, "the jump button jumps");
  await t.tap(".t-pause");
  await until(t, () => window.__GAME.screen === "pause");
  check(true, "the corner button pauses");
  check(t.errors.length === 0, `no page errors (${t.errors.slice(0, 3).join(" | ")})`);
  await t.context().close();
} catch (e) {
  failures.push(String(e && e.message ? e.message.split("\n")[0] : e));
  console.log("  FAIL " + failures[failures.length - 1]);
} finally {
  await browser.close();
  server.httpServer.close();
}
console.log(failures.length ? `smoke: FAILED (${failures.length})` : "smoke: OK");
process.exit(failures.length ? 1 : 0);
