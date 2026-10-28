import assert from "node:assert/strict";
import { test } from "node:test";
import { SeasonPlots } from "../src/sim/seasonPlots.ts";

const sockets = [
  { id: "a", band: "autumn" as const, order: 2 },
  { id: "w", band: "winter" as const, order: 1 },
  { id: "w2", band: "winter" as const, order: 0 },
];

test("growth is tier + band bonus, capped at IV, overflow becomes a seed, never negative", () => {
  assert.deepEqual(SeasonPlots.growth({ id: "ks.blade", tier: 1 }, "autumn", 0), { grows: 2, overflow: 0 });
  assert.deepEqual(SeasonPlots.growth({ id: "ks.blade", tier: 1 }, "winter", 0), { grows: 3, overflow: 0 });
  assert.deepEqual(SeasonPlots.growth({ id: "ks.blade", tier: 3 }, "winter", 0), { grows: 4, overflow: 1 });
  assert.deepEqual(SeasonPlots.growth({ id: "scrap.nail", tier: 0 }, "winter", 3), { grows: 0, overflow: 0 });
  for (let tier = 0; tier <= 4; tier++) for (const band of ["autumn", "winter"] as const) for (let seed = 0; seed < 4; seed++) {
    const g = SeasonPlots.growth({ id: "ks.hook", tier }, band, seed);
    assert.ok(g.grows >= 1 && g.grows <= 4 && g.overflow >= 0);
  }
});

test("seed carries to the next keepsake burial only", () => {
  const sp = new SeasonPlots(sockets);
  sp.bury("w", { id: "ks.shield", tier: 3 });
  assert.equal(sp.seed, 1);
  sp.bury("a", { id: "scrap.cup", tier: 0 });
  assert.equal(sp.seed, 1, "scrap does not spend the seed");
  const r = sp.bury("w2", { id: "ks.hook", tier: 1 });
  assert.equal(r.seedUsed, 1);
  assert.equal(r.grows, 4);
  assert.equal(sp.seed, 0);
});

test("a taken plot refuses a second burial", () => {
  const sp = new SeasonPlots(sockets);
  sp.bury("a", { id: "ks.blade", tier: 1 });
  assert.equal(sp.canBury("a"), false);
  assert.throws(() => sp.bury("a", { id: "ks.hook", tier: 1 }));
});

test("the turn rises bottom first; scrap rots to a stump; harvest returns the grown tier once", () => {
  const sp = new SeasonPlots(sockets);
  sp.bury("a", { id: "ks.blade", tier: 1 });
  sp.bury("w2", { id: "scrap.nail", tier: 0 });
  const risen = sp.turn();
  assert.deepEqual(risen.map((p) => p.id), ["w2", "a"]);
  assert.equal(sp.get("w2").landmark?.kind, "stump");
  assert.deepEqual(sp.harvest("a"), { id: "ks.blade", tier: 2 });
  assert.throws(() => sp.harvest("a"));
  assert.throws(() => sp.harvest("w2"));
});

test("new year clears plots and keeps the seed; snapshot round-trips and drops unknown plots", () => {
  const sp = new SeasonPlots(sockets);
  sp.bury("w", { id: "ks.lantern", tier: 4 });
  const snap = JSON.parse(JSON.stringify(sp.snapshot()));
  snap.plots.push({ id: "gone", item: null, grows: 0, landmark: null });
  const sp2 = new SeasonPlots(sockets);
  sp2.restore(snap);
  assert.deepEqual(sp2.snapshot(), sp.snapshot());
  sp.newYear();
  assert.ok(sp.plots.every((p) => !p.item && !p.landmark));
  assert.equal(sp.seed, 2);
});
