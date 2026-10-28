// Climb bot (GDD §41): proves on the real movement code that, with zero landmarks and without touching thorns,
// Folio can descend the face in autumn/winter and climb it back in spring. Searches over macro moves
// (walk, jump arcs, slides, drop-throughs) from every reachable standing spot. Exit code 1 on failure.
import { EMBERFELL_FACE_1 } from "../src/data/rooms/emberfell.ts";
import { TUNE } from "../src/data/tuning.ts";
import { PaperBody, type MoveInput } from "../src/sim/body.ts";
import { World } from "../src/sim/world.ts";

const DT = 1 / TUNE.tickRate;
type Macro = { name: string; ticks: number; input: (t: number) => MoveInput };
const mk = (x: number, o: Partial<MoveInput> = {}): MoveInput => ({ x, up: false, down: false, jump: false, jumpPressed: false, slidePressed: false, ...o });

const MACROS: Macro[] = [];
for (const d of [-1, 1]) {
  for (const n of [8, 20, 45]) MACROS.push({ name: `walk${d}x${n}`, ticks: n, input: () => mk(d) });
  for (const hold of [8, 30, 70]) for (const steer of [0, 12, 30, 60, 90])
    MACROS.push({ name: `jump${d}h${hold}s${steer}`, ticks: 110, input: (t) => mk(t < steer ? d : 0, { jump: t < hold, jumpPressed: t === 0 }) });
  // Run-up then jump: covers long gaps.
  for (const hold of [30, 70]) MACROS.push({ name: `runjump${d}h${hold}`, ticks: 140, input: (t) => mk(d, { jump: t >= 10 && t < 10 + hold, jumpPressed: t === 10 }) });
  for (const n of [60, 450]) MACROS.push({ name: `slide${d}x${n}`, ticks: n, input: (t) => mk(d, { slidePressed: t === 0 }) });
}
MACROS.push({ name: "drop", ticks: 40, input: (t) => mk(0, { down: true, jump: t < 2, jumpPressed: t === 0 }) });

function search(world: World, start: { x: number; y: number }, goal: (b: PaperBody) => boolean, label: string): boolean {
  const seen = new Set<string>();
  const key = (x: number, y: number) => `${Math.round(x * 2)},${Math.round(y * 4)}`;
  const queue: Array<{ x: number; y: number }> = [start];
  seen.add(key(start.x, start.y));
  let thornTouches = 0;
  let farthest = start;
  while (queue.length) {
    const s = queue.shift()!;
    for (const m of MACROS) {
      const b = new PaperBody(world, s.x, s.y);
      b.grounded = true;
      let ok = true;
      for (let t = 0; t < m.ticks + 240; t++) {
        b.step(DT, t < m.ticks ? m.input(t) : mk(0));
        b.events.length = 0;
        if (touchesThorns(world, b)) { ok = false; thornTouches++; break; }
        if (b.y < 0) { ok = false; break; }
        if (goal(b)) {
          console.log(`  ${label}: reached in ${seen.size} spots`);
          return true;
        }
        if (t >= m.ticks && b.grounded && Math.abs(b.vx) < 0.05 && b.form === "stand") break;
      }
      if (!ok || !b.grounded || b.form !== "stand") continue;
      const k = key(b.x, b.y);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: b.x, y: b.y });
      if (label.startsWith("descent") ? b.x > farthest.x : b.x < farthest.x) farthest = { x: b.x, y: b.y };
    }
  }
  const r = world.roomAt(farthest.x);
  console.log(`  ${label}: FAILED after ${seen.size} spots (${thornTouches} thorn touches); farthest x ${farthest.x.toFixed(1)} y ${farthest.y.toFixed(1)} in ${r.def.name}`);
  return false;
}

function touchesThorns(world: World, b: PaperBody): boolean {
  for (let cx = Math.floor(b.x - b.w / 2 + 0.05); cx <= Math.floor(b.x + b.w / 2 - 0.05); cx++)
    for (let cy = Math.floor(b.y + 0.05); cy <= Math.floor(b.y + b.h - 0.05); cy++) if (world.thorns(cx, cy)) return true;
  return false;
}

const world = new World(EMBERFELL_FACE_1);
const floor = world.rooms[world.rooms.length - 1]!;
const hearthRoom = world.rooms[0]!;
let pass = true;
console.log("climb-check: Emberfell face 1");
world.spring = false;
pass = search(world, { x: world.hearth.x + 1.5, y: world.hearth.y }, (b) => b.x > floor.x0 + 4 && b.grounded, "descent (autumn/winter, bare)") && pass;
world.spring = true;
pass = search(world, { x: world.guardian.x, y: world.guardian.y }, (b) => b.x < hearthRoom.x1 - 3 && b.grounded, "climb (spring, zero landmarks, no thorns)") && pass;
console.log(pass ? "climb-check: OK" : "climb-check: FAILED");
process.exit(pass ? 0 : 1);
