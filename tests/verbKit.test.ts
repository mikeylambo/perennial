import assert from "node:assert/strict";
import { test } from "node:test";
import { Pack } from "../src/sim/verbKit.ts";

test("three slots: add fills in order and refuses when full", () => {
  const p = new Pack();
  assert.equal(p.add({ id: "ks.blade", tier: 1 }), 0);
  assert.equal(p.add({ id: "scrap.nail", tier: 0 }), 1);
  assert.equal(p.add({ id: "ks.hook", tier: 2 }), 2);
  assert.ok(p.full);
  assert.equal(p.add({ id: "ks.lantern", tier: 1 }), -1);
});

test("take empties the slot; swap returns the old item", () => {
  const p = new Pack();
  p.add({ id: "ks.blade", tier: 1 });
  assert.deepEqual(p.swap(0, { id: "ks.shield", tier: 2 }), { id: "ks.blade", tier: 1 });
  assert.deepEqual(p.take(0), { id: "ks.shield", tier: 2 });
  assert.ok(p.empty);
  assert.equal(p.take(0), null);
});

test("verbs come from keepsakes only; best is the most valuable keepsake", () => {
  const p = new Pack();
  p.add({ id: "scrap.cup", tier: 0 });
  p.add({ id: "ks.hook", tier: 1 });
  p.add({ id: "ks.blade", tier: 1 });
  assert.equal(p.verb(0), null);
  assert.ok(p.verb(1));
  assert.deepEqual(p.best(), { id: "ks.blade", tier: 1 });
  assert.ok(p.has("ks.hook"));
});
