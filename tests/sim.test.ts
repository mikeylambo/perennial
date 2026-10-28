import assert from "node:assert/strict";
import { test } from "node:test";
import { DT, NO_INPUT, Sim, type Input } from "../src/sim/sim.ts";

const idle = (): Input => ({ ...NO_INPUT, verb: [false, false, false] });
const run = (sim: Sim, n: number, inp: Partial<Input> = {}) => {
  for (let i = 0; i < n; i++) sim.step({ ...idle(), ...inp });
};
const standAt = (sim: Sim, x: number, y: number) => {
  const b = sim.body;
  b.x = x;
  b.y = y + 0.05;
  b.vx = b.vy = 0;
  run(sim, 20);
};

function tape(seed: number, n: number): Input[] {
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out: Input[] = [];
  let cur = idle();
  for (let i = 0; i < n; i++) {
    if (i % 24 === 0) cur = { x: r() < 0.75 ? 1 : r() < 0.5 ? -1 : 0, up: r() < 0.05, down: r() < 0.08, jump: r() < 0.35, slide: r() < 0.1, verb: [r() < 0.2, r() < 0.1, r() < 0.1], act: r() < 0.1, pick: 0 };
    out.push(cur);
  }
  return out;
}

function bury(sim: Sim, plotIndex: number) {
  const p = sim.world.plots[plotIndex]!;
  sim.enemies = []; // a hit cancels the hold; this test is about the burial
  standAt(sim, p.cx + 0.5, p.cy);
  assert.equal(sim.near?.kind, "plot", `near plot ${p.id}`);
  run(sim, Math.ceil(0.6 / DT) + 2, { act: true });
  run(sim, 30);
  assert.ok(sim.plots.get(p.id).item, `buried in ${p.id}`);
  return p;
}

function winGuardian(sim: Sim) {
  sim.warp(sim.world.rooms.length - 1);
  const floor = sim.floor;
  standAt(sim, floor.x0 + 6, sim.world.guardian.y);
  run(sim, 10, { x: 1 });
  assert.equal(sim.phase, "guardian");
  for (let guard = 0; sim.wolfParts.length && guard < 20; guard++) {
    for (const e of sim.wolfParts) sim.hurtEnemy(e, 999, "cut", true, 4, 1);
    run(sim, 30);
  }
  assert.equal(sim.phase, "turn");
  run(sim, Math.ceil(sim.turnLength / DT) + 2);
  assert.equal(sim.phase, "climb");
}

test("same seed + same input tape = identical end state", () => {
  const a = new Sim(42), b = new Sim(42);
  for (const inp of tape(7, 4000)) {
    a.step(inp);
    b.step(inp);
  }
  const snap = (s: Sim) => JSON.stringify({ x: s.body.x, y: s.body.y, c: s.creases, ph: s.phase, e: s.enemies.map((e) => [e.id, e.x, e.y, e.hp]), p: s.pack.slots });
  assert.equal(snap(a), snap(b));
});

test("Folio never leaves legal world bounds under random play", () => {
  for (const seed of [1, 2, 3]) {
    const sim = new Sim(seed);
    for (const inp of tape(seed * 13, 6000)) {
      sim.step(inp);
      if (sim.phase === "torn") break;
      const b = sim.body;
      assert.ok(b.x >= 0 && b.x <= sim.world.W, `x in bounds (${b.x})`);
      assert.ok(Number.isFinite(b.y) && b.y < sim.world.H + 4, `y finite (${b.y})`);
    }
  }
});

test("a burial always removes the item from the pack; the turn raises it; a harvest returns it grown", () => {
  const sim = new Sim(5);
  sim.givePack("blade:1,hook:1");
  const winterPlot = sim.world.plots.findIndex((p) => p.band === "winter");
  assert.ok(winterPlot >= 0);
  sim.pack.selected = 0;
  const p = bury(sim, winterPlot);
  assert.equal(sim.pack.has("ks.blade"), false);
  assert.equal(sim.plots.get(p.id).item?.id, "ks.blade");
  assert.equal(sim.stats.burials.length, 1);
  winGuardian(sim);
  const lm = sim.landmarks.find((l) => l.plot.id === p.id)!;
  assert.ok(lm, "a landmark rose");
  assert.equal(lm.plot.landmark?.tier, 3, "winter grows I to III");
  standAt(sim, lm.harvestX, lm.top);
  assert.equal(sim.near?.kind, "bloom");
  run(sim, 1, { act: true });
  run(sim, 2);
  assert.ok(sim.pack.slots.some((s) => s?.id === "ks.blade" && s.tier === 3));
});

test("scrap rots into a stump at the turn", () => {
  const sim = new Sim(6);
  sim.givePack("nail");
  const p = bury(sim, 0);
  winGuardian(sim);
  assert.equal(sim.plots.get(p.id).landmark?.kind, "stump");
  assert.ok(sim.world.stumps.size >= 1);
});

test("a run always terminates: three years end at done, and taking every crease ends torn", () => {
  const sim = new Sim(9);
  for (let y = 1; y <= 3; y++) {
    winGuardian(sim);
    const hearth = sim.world.rooms[0]!;
    standAt(sim, hearth.x1 - 6, sim.world.hearth.y);
    run(sim, 5);
    assert.equal(sim.phase, "hearth", `year ${y} reaches the hearth`);
    sim.continueYear();
  }
  assert.equal(sim.phase, "done");
  const t = new Sim(10);
  t.body.y = -5;
  run(t, 3);
  assert.equal(t.phase, "torn");
});
