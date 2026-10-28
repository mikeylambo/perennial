// Perennial, Phase 0 thesis proof (GDD §40). Boots the Shell services, runs the 120 Hz simulation with an
// accumulator, and drives the paper renderer, HUD, screens and synth audio from the sim's semantic events.
import { SaveManager, type StorageAdapter } from "@slu/web-shell";
import { ThreeAdapter } from "@slu/web-shell/adapters";
import { Audio } from "./audio/audio.ts";
import { TUNE } from "./data/tuning.ts";
import { PaperRenderer } from "./render/scene.ts";
import { DT, Sim, type SimEvent } from "./sim/sim.ts";
import { Hud } from "./ui/hud.ts";
import { GameInput } from "./ui/input.ts";
import { DEFAULT_SETTINGS, Screens, type Settings } from "./ui/screens.ts";
import "./style.css";

declare const __APP_VERSION__: string;

/** localStorage when available; memory otherwise (private windows, blocked storage). */
class SafeStorage implements StorageAdapter {
  private mem = new Map<string, string>();
  private readonly ls: Storage | null;
  constructor() {
    let ls: Storage | null = null;
    try {
      ls = window.localStorage;
      ls.setItem("perennial:probe", "1");
      ls.removeItem("perennial:probe");
    } catch {
      ls = null;
    }
    this.ls = ls;
  }
  async get<T>(key: string): Promise<T | null> {
    let raw: string | null = null;
    try {
      raw = this.ls ? this.ls.getItem(`perennial:${key}`) : this.mem.get(key) ?? null;
    } catch {
      raw = this.mem.get(key) ?? null;
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.ls) this.ls.setItem(`perennial:${key}`, raw);
      else this.mem.set(key, raw);
    } catch {
      this.mem.set(key, raw);
    }
  }
  async remove(key: string): Promise<void> {
    try {
      this.ls?.removeItem(`perennial:${key}`);
    } catch {
      /* ignore */
    }
    this.mem.delete(key);
  }
  async keys(): Promise<string[]> {
    return [...this.mem.keys()];
  }
}

interface Profile {
  settings: Settings;
  best: number;
  bestYears: number;
  runs: number;
  /** Telemetry for the Phase 0 exit question (GDD §40): did they bury their best before the wolf? */
  buriedBestBeforeGuardian: number;
  [k: string]: unknown;
}

const q = new URLSearchParams(location.search);
const FLAGS = {
  pack: q.get("pack"),
  room: q.has("room") ? Number(q.get("room")) : null,
  god: q.has("god"),
  skipTitle: q.has("play") || q.has("pack") || q.has("room"),
  seed: Number(q.get("seed") ?? Date.now() % 100000),
  manual: q.has("step"),
  quality: q.get("quality") as Settings["quality"] | null,
};

const app = document.getElementById("app")!;
const canvas = document.createElement("canvas");
canvas.className = "view";
app.appendChild(canvas);

const saves = new SaveManager<Profile>(new SafeStorage(), "profile", 1);
let profile: Profile = { settings: { ...DEFAULT_SETTINGS }, best: 0, bestYears: 0, runs: 0, buriedBestBeforeGuardian: 0 };

const input = new GameInput();
const audio = new Audio();
const hud = new Hud(app);
const screens = new Screens(app);
screens.onSound = (k) => audio.ui(k);
input.onFamily = (f) => (hud.family = f);

let sim = new Sim(FLAGS.seed);
let view = new PaperRenderer(canvas, sim);
view.onPluck = (tier) => {
  audio.pluck(tier);
  if (profile.settings.haptics) audio.haptic({ id: "pluck" });
};
let mode: "title" | "play" | "paused" | "menu" | "over" = "title";
let acc = 0;
let last = performance.now();
let prevX = sim.body.x, prevY = sim.body.y;
let pendingHearth: { at: number; line: string } | null = null;
let pendingResults: { at: number; outcome: "torn" | "done" } | null = null;
let clock = 0;
let outcome: "torn" | "done" | "abandon" = "done";
/** Steps quality down at runtime when frames run long for a few seconds (GDD §36); never up, never saved. */
let autoQuality: Settings["quality"] | null = null;
let slowT = 0;
function watchFrameTime(dt: number): void {
  if (mode !== "play" || FLAGS.quality) return;
  slowT = dt > 1 / 40 ? slowT + dt : Math.max(0, slowT - dt * 0.5);
  if (slowT < 3) return;
  slowT = 0;
  const cur = autoQuality ?? profile.settings.quality;
  const next = cur === "high" ? "medium" : cur === "medium" ? "low" : null;
  if (!next) return;
  autoQuality = next;
  view.applyQuality(next);
}

function applySettings(): void {
  const s = profile.settings;
  audio.settings = { master: s.master, music: s.music, sfx: s.sfx, muted: false };
  audio.apply();
  view.settings = { shake: s.shake, reduceFlash: s.reduceFlash, reduceMotion: s.reduceMotion, quality: s.quality };
  view.applyQuality(FLAGS.quality ?? autoQuality ?? s.quality);
  hud.showPrompts = s.prompts;
  document.documentElement.classList.toggle("reduce-motion", s.reduceMotion);
}

function persist(): void {
  void saves.save(profile).catch(() => undefined);
}

function newRun(): void {
  view.renderer.dispose();
  const c2 = canvas;
  sim = new Sim(FLAGS.seed + profile.runs * 7919);
  view = new PaperRenderer(c2, sim);
  view.onPluck = (tier) => audio.pluck(tier);
  applySettings();
  if (FLAGS.pack) sim.givePack(FLAGS.pack);
  if (FLAGS.room !== null) sim.warp(FLAGS.room);
  prevX = sim.body.x;
  prevY = sim.body.y;
  pendingHearth = pendingResults = null;
  hud.reset();
  hud.show(true);
  screens.close();
  mode = "play";
  acc = 0;
  const evs = sim.drain();
  route(evs);
}

function showTitle(): void {
  mode = "title";
  hud.show(false);
  audio.setCue("autumn");
  screens.title(profile.best ? { score: profile.best, years: profile.bestYears } : null, () => {
    audio.unlock();
    newRun();
  }, () => openSettings(showTitle));
}

function openSettings(back: () => void): void {
  screens.settings(profile.settings, () => {
    autoQuality = null;
    applySettings();
    persist();
  }, back);
}

function pause(): void {
  if (mode !== "play") return;
  mode = "paused";
  screens.pause(resume, () => openSettings(() => {
    mode = "play";
    pause();
  }), () => {
    outcome = "abandon";
    finish();
  });
}

function resume(): void {
  screens.close();
  mode = "play";
  last = performance.now();
}

function finish(): void {
  mode = "over";
  hud.show(false);
  const score = sim.score();
  const best = Math.max(profile.best, score);
  profile.runs++;
  if (sim.stats.burials.some((b) => b.best && b.beforeGuardian)) profile.buriedBestBeforeGuardian++;
  if (score >= profile.best) {
    profile.best = score;
    profile.bestYears = sim.stats.yearsDone;
  }
  persist();
  audio.setCue("hearth");
  screens.results(sim, outcome, best, newRun, showTitle);
}

function route(events: SimEvent[]): void {
  if (!events.length) return;
  view.handle(events);
  hud.handle(events, sim);
  for (const e of events) {
    audio.play(e);
    if (profile.settings.haptics) audio.haptic(e);
    if (e.id === "hearth") pendingHearth = { at: clock + 1.4, line: e.line as string };
    if (e.id === "torn") pendingResults = { at: clock + 2.4, outcome: "torn" };
    if (e.id === "run.done") pendingResults = { at: clock + 0.2, outcome: "done" };
  }
}

function musicCue(): void {
  const p = sim.phase;
  if (p === "guardian") return audio.setCue("guardian");
  if (p === "turn" || p === "climb") return audio.setCue("spring");
  if (p === "hearth" || p === "done") return audio.setCue("hearth");
  if (p === "torn") return audio.setCue("silent");
  const band = sim.world.roomAt(sim.body.x).def.band;
  audio.setCue(band === "winter" || band === "floor" ? "winter" : "autumn");
}

function stepSim(): void {
  prevX = sim.body.x;
  prevY = sim.body.y;
  const inp = mode === "play" ? input.read() : GameInput.none();
  if (sim.phase === "turn") inp.verb = [false, false, false]; // the turn ignores verb inputs (GDD §8)
  sim.step(inp);
  if (FLAGS.god) sim.creases = TUNE.creases;
  route(sim.drain());
}

function menuInput(): void {
  if (input.pressed("up")) screens.nav(-1);
  if (input.pressed("down")) screens.nav(1);
  if (input.pressed("left")) screens.adjust(-1);
  if (input.pressed("right")) screens.adjust(1);
  if (input.pressed("confirm") || input.pressed("jump") || input.pressed("act")) screens.confirm();
  if (input.pressed("back") || input.pressed("slide") || input.pressed("pause")) screens.goBack();
}

function frame(now: number): void {
  // rAF timestamps can precede a `last` taken with performance.now(); never let dt go negative.
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  input.poll();
  if (mode === "play" && input.pressed("pause")) pause();
  else if (mode !== "play" && screens.current) menuInput();

  if (mode === "play" && !FLAGS.manual) {
    clock += dt;
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 24) {
      stepSim();
      acc -= DT;
      n++;
    }
    if (n >= 24) acc = 0;
    if (pendingHearth && clock >= pendingHearth.at) {
      const line = pendingHearth.line;
      pendingHearth = null;
      mode = "menu";
      hud.show(false);
      screens.hearth(sim, line, () => {
        screens.close();
        sim.continueYear();
        route(sim.drain());
        if (sim.phase !== "done") {
          hud.show(true);
          mode = "play";
          prevX = sim.body.x;
          prevY = sim.body.y;
        }
      });
    }
    if (pendingResults && clock >= pendingResults.at) {
      outcome = pendingResults.outcome;
      pendingResults = null;
      finish();
    }
  } else if (mode === "menu" && pendingResults) {
    outcome = pendingResults.outcome;
    pendingResults = null;
    finish();
  }
  watchFrameTime(dt);
  musicCue();
  audio.tick();
  const alpha = mode === "play" ? acc / DT : 1;
  const fx = prevX + (sim.body.x - prevX) * alpha, fy = prevY + (sim.body.y - prevY) * alpha;
  const frozen = mode === "paused" || mode === "title";
  view.render(frozen ? 0 : dt, fx, fy);
  hud.update(dt, sim, view.camera, fx, fy);
  requestAnimationFrame(frame);
}

// The Shell's renderer seam: lifecycle reaches the paper renderer through ThreeAdapter hooks.
const adapter = new ThreeAdapter({
  onResize: () => view.resize(),
  onSuspend: () => {
    pause();
    audio.suspend(true);
  },
  onResume: () => audio.suspend(false),
  onScreenshot: async () => {
    view.render(0, sim.body.x, sim.body.y);
    return canvas.toDataURL("image/png");
  },
});
addEventListener("resize", () => adapter.resize(innerWidth, innerHeight, devicePixelRatio));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) adapter.suspend();
  else adapter.resume();
});
addEventListener("blur", () => pause());
addEventListener("gamepaddisconnected", () => pause());
addEventListener("pointerdown", () => audio.unlock(), { once: true });
addEventListener("keydown", () => audio.unlock(), { once: true });

// Test and debug hooks (GDD §32).
const game = {
  get sim() {
    return sim;
  },
  get mode() {
    return mode;
  },
  get view() {
    return view;
  },
  get screen() {
    return screens.current;
  },
  version: __APP_VERSION__,
  step(n = 1, inp?: Partial<ReturnType<typeof GameInput.none>>) {
    for (let i = 0; i < n; i++) {
      prevX = sim.body.x;
      prevY = sim.body.y;
      sim.step({ ...GameInput.none(), ...inp });
      if (FLAGS.god) sim.creases = TUNE.creases;
      clock += DT;
      route(sim.drain());
    }
  },
  begin: () => newRun(),
  pause,
  resume,
  finish: (o: "torn" | "done" | "abandon" = "abandon") => {
    outcome = o;
    finish();
  },
};
(window as unknown as { __GAME: typeof game }).__GAME = game;

void (async () => {
  try {
    const loaded = await saves.load();
    if (loaded) profile = { ...profile, ...loaded, settings: { ...DEFAULT_SETTINGS, ...loaded.settings } };
  } catch {
    /* corrupt save: keep defaults */
  }
  applySettings();
  input.family = matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard";
  hud.family = input.family;
  document.documentElement.dataset.input = input.family;
  if (FLAGS.skipTitle) newRun();
  else showTitle();
  requestAnimationFrame(frame);
})();
