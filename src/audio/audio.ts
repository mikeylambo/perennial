// Synth-in-code audio (GDD §26): paper SFX per event, a small season-led chamber-folk loop, and the gardener's motif.
// Every distinct event gets its own timbre. Drop-in recorded cues are Phase 5.
import type { SimEvent } from "../sim/sim.ts";

type Cue = "autumn" | "winter" | "guardian" | "spring" | "hearth" | "silent";

const MOTIF = [0, 4, 7, 9, 7, 4, 2, 0]; // the gardener's motif, scale degrees in semitones
const SCALES: Record<Exclude<Cue, "silent">, { root: number; steps: number[]; tempo: number; voice: OscillatorType; bass: boolean; density: number }> = {
  autumn: { root: 57, steps: [0, 2, 4, 7, 9, 12], tempo: 0.34, voice: "triangle", bass: true, density: 0.8 },
  winter: { root: 52, steps: [0, 3, 7, 10, 12], tempo: 0.55, voice: "sine", bass: false, density: 0.45 },
  guardian: { root: 45, steps: [0, 3, 5, 7, 10], tempo: 0.2, voice: "sawtooth", bass: true, density: 0.9 },
  spring: { root: 60, steps: [0, 2, 4, 7, 9, 12, 14], tempo: 0.28, voice: "triangle", bass: true, density: 0.9 },
  hearth: { root: 55, steps: [0, 4, 7, 11, 12], tempo: 0.6, voice: "sine", bass: true, density: 0.5 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export interface AudioSettings { master: number; music: number; sfx: number; muted: boolean }

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private cue: Cue = "silent";
  private nextNote = 0;
  private step = 0;
  private duck = 1;
  settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.9, muted: false };

  /** Browsers need a gesture before audio starts. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
  }

  apply(): void {
    if (!this.ctx) return;
    const m = this.settings.muted ? 0 : this.settings.master;
    this.master.gain.value = m;
    this.music.gain.value = this.settings.music * 0.35;
    this.sfx.gain.value = this.settings.sfx;
  }

  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setCue(c: Cue): void {
    this.cue = c;
  }

  /** Music scheduler; call each frame. */
  tick(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || this.cue === "silent") return;
    const sc = SCALES[this.cue];
    const now = ctx.currentTime;
    if (this.nextNote < now) this.nextNote = now + 0.05;
    this.duck += (1 - this.duck) * 0.05;
    while (this.nextNote < now + 0.2) {
      const t = this.nextNote;
      const bar = Math.floor(this.step / 8) % 8;
      const i = this.step % 8;
      // Every fourth bar plays the motif; others wander the scale.
      if (bar % 4 === 3) this.note(midi(sc.root + 12 + MOTIF[i]!), t, sc.tempo * 1.6, sc.voice === "sawtooth" ? "triangle" : sc.voice, 0.16);
      else if (Math.random() < sc.density) this.note(midi(sc.root + 12 + sc.steps[Math.floor(Math.random() * sc.steps.length)]!), t, sc.tempo * 1.4, sc.voice === "sawtooth" ? "triangle" : sc.voice, 0.11);
      if (sc.bass && i % 4 === 0) this.note(midi(sc.root - 12 + (bar % 2 ? 5 : 0)), t, sc.tempo * 3.6, "sine", 0.18);
      if (this.cue === "guardian" && i % 2 === 0) this.drum(t, i % 4 === 0 ? 0.3 : 0.14);
      this.nextNote += sc.tempo;
      this.step++;
    }
  }

  private note(f: number, t: number, len: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * this.duck, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  private drum(t: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.3);
  }

  // ------------------------------------------------------------ SFX primitives

  private tone(f: number, len: number, vol: number, type: OscillatorType = "sine", slide = 1, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + len);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + len);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + len + 0.02);
  }

  /** Filtered noise: the basis of every paper sound. */
  private rustle(len: number, vol: number, freq: number, q = 1, type: BiquadFilterType = "bandpass", delay = 0, sweep = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + len);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + len);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + len + 0.02);
  }

  ui(kind: "tap" | "flip" | "back"): void {
    if (kind === "tap") this.rustle(0.05, 0.25, 3000, 2);
    else if (kind === "flip") this.rustle(0.14, 0.3, 1800, 0.8, "bandpass", 0, 2.2);
    else this.rustle(0.12, 0.25, 2200, 0.8, "bandpass", 0, 0.5);
  }

  pluck(tier: number): void {
    this.tone(midi(72 + [0, 2, 4, 7, 9][Math.min(4, tier)]! + Math.floor(Math.random() * 3) * 2), 0.22, 0.08, "triangle");
    this.rustle(0.05, 0.12, 4000, 3);
  }

  play(e: SimEvent): void {
    if (!this.ctx) return;
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    switch (e.id) {
      case "move.jump": this.rustle(0.08, 0.18, 2600, 1.5, "bandpass", 0, 1.6); break;
      case "move.land": this.rustle(0.07, Math.min(0.35, 0.08 + (e.speed as number) * 0.015), 900, 1); break;
      case "move.dart": this.rustle(0.12, 0.2, 3500, 2, "bandpass", 0, 0.4); break;
      case "move.flatten": this.rustle(0.1, 0.25, 1400, 2, "bandpass", 0, 0.6); this.tone(180, 0.06, 0.08, "square"); break;
      case "move.crumple": this.rustle(0.25, 0.25, 700, 0.7, "lowpass"); break;
      case "move.unfold": this.rustle(0.12, 0.18, 2000, 1, "bandpass", 0, 1.8); break;
      case "move.bonk": this.rustle(0.05, 0.2, 500, 1); break;
      case "verb.use":
        if (e.verb === "blade") { this.rustle(0.09, 0.28, r(4200, 5200), 3, "bandpass", 0, 0.5); this.tone(r(880, 990) * (1 + ((e.chain as number) - 1) * 0.12), 0.07, 0.05, "triangle"); }
        else if (e.verb === "lantern") { this.rustle(0.4, 0.3, 600, 0.6, "lowpass", 0, 3); this.tone(660, 0.6, 0.08, "sine"); this.tone(990, 0.5, 0.05, "sine", 1, 0.05); }
        break;
      case "hook.throw": this.rustle(0.15, 0.2, 3000, 2, "bandpass", 0, 0.5); break;
      case "hook.attach": this.tone(1400, 0.08, 0.1, "square"); this.tone(700, 0.1, 0.08, "triangle"); break;
      case "hook.release": this.rustle(0.08, 0.15, 2500, 2); break;
      case "block": this.tone(220, 0.12, 0.25, "triangle", 0.7); this.rustle(0.08, 0.2, 800); break;
      case "parry": this.tone(523, 0.3, 0.2, "triangle"); this.tone(784, 0.35, 0.16, "triangle", 1, 0.03); this.rustle(0.1, 0.3, 1600, 1); break;
      case "dodge.perfect": this.tone(1200, 0.15, 0.08, "sine", 1.5); break;
      case "stomp": this.rustle(0.1, 0.35, 600, 1); this.tone(140, 0.1, 0.2, "sine", 0.6); break;
      case "enemy.hit": {
        const stock = e.stock as string;
        const heavy = !!e.heavy;
        if (stock === "card") { this.tone(120, 0.12, 0.35, "square", 0.6); this.rustle(0.08, 0.25, 500); }
        else if (stock === "wax") { this.tone(r(500, 640), 0.1, 0.18, "sawtooth", 1.4); }
        else if (stock === "felt" || stock === "plain") { this.tone(90, 0.12, 0.35, "sine", 0.7); this.rustle(0.1, 0.25, 400, 0.7, "lowpass"); }
        else this.rustle(0.12, 0.3, r(2400, 3400), 1.2);
        if (heavy) { this.tone(70, 0.2, 0.3, "sine", 0.6); this.duck = 0.6; }
        break;
      }
      case "enemy.die": this.rustle(0.35, 0.3, 1800, 0.6, "bandpass", 0, 0.3); this.tone(300, 0.2, 0.08, "triangle", 0.5); break;
      case "enemy.tell": this.tone(e.kind === "rook" ? 330 : 880, 0.1, 0.14, "square", e.kind === "rook" ? 0.8 : 1.2); break;
      case "enemy.attack": this.rustle(0.1, 0.2, 2000, 1); break;
      case "guardian.tell": this.tone(110, 0.35, 0.3, "sawtooth", 1.6); this.rustle(0.3, 0.2, 500, 0.6, "lowpass"); break;
      case "guardian.howl":
        this.tone(220, 1.2, 0.18, "sawtooth", 1.5);
        this.tone(330, 1.0, 0.1, "triangle", 1.4, 0.1);
        this.rustle(1.2, 0.18, 2500, 0.5, "highpass");
        break;
      case "guardian.land": this.tone(60, 0.35, 0.45, "sine", 0.5); this.rustle(0.3, 0.3, 300, 0.6, "lowpass"); break;
      case "guardian.phase": this.rustle(0.6, 0.4, 1200, 0.5, "bandpass", 0, 0.3); this.tone(80, 0.5, 0.4, "sine", 0.5); break;
      case "guardian.fall": this.rustle(1.2, 0.35, 1600, 0.4, "bandpass", 0, 0.2); this.tone(55, 1.2, 0.4, "sine", 0.6); break;
      case "crease.take": this.rustle(0.09, 0.45, 2400, 4); this.tone(160, 0.12, 0.2, "square", 0.5); break;
      case "crease.mend": this.tone(1600, 0.25, 0.06, "sine", 0.6); this.rustle(0.25, 0.1, 5000, 4, "bandpass", 0, 0.5); break;
      case "paper.damp": this.rustle(0.2, 0.15, 400, 0.6, "lowpass"); break;
      case "paper.soaked": this.tone(200, 0.3, 0.12, "sine", 0.6); break;
      case "paper.dry": this.rustle(0.3, 0.12, 4000, 1, "bandpass", 0, 1.5); break;
      case "thorns.hit": this.rustle(0.08, 0.3, 3200, 5); break;
      case "thorns.burn": this.rustle(0.4, 0.2, 900, 0.7, "lowpass", 0, 2); break;
      case "moth.dust": this.rustle(0.6, 0.1, 6000, 1, "highpass"); break;
      case "item.pickup": this.rustle(0.1, 0.18, 2500, 1); this.tone(midi(79), 0.4, 0.08, "triangle"); this.tone(midi(84), 0.5, 0.06, "triangle", 1, 0.08); break;
      case "item.drop": this.rustle(0.1, 0.18, 1600, 1); break;
      case "pack.full": this.tone(240, 0.12, 0.08, "triangle"); break;
      case "pack.select": this.rustle(0.05, 0.15, 3200, 2); break;
      case "hold.start": this.rustle(0.4, 0.08, 500, 0.5, "lowpass"); break;
      case "item.bury":
        this.rustle(0.18, 0.35, 700, 0.8, "lowpass"); // spade
        this.rustle(0.14, 0.25, 500, 0.8, "lowpass", 0.18);
        this.tone(midi(48), 1.4, 0.18, "sine", 1, 0.25); // low bell
        this.tone(midi(55), 1.2, 0.08, "sine", 1, 0.25);
        this.duck = 0.5;
        break;
      case "landmark.harvest":
        for (const [i, n] of [0, 4, 7, 12].entries()) this.tone(midi(67 + n), 0.9, 0.1, "triangle", 1, i * 0.07);
        break;
      case "season.turn": for (const [i, n] of MOTIF.entries()) this.tone(midi(64 + n), 0.8, 0.09, "triangle", 1, 0.5 + i * 0.32); break;
      case "plot.rot": this.rustle(0.6, 0.15, 300, 0.6, "lowpass", 1.2); break;
      case "torn": this.rustle(1.0, 0.5, 2000, 0.6, "bandpass", 0, 0.25); this.tone(midi(40), 2, 0.12, "sine", 0.9, 0.6); break;
      case "hearth": for (const [i, n] of [0, 4, 7, 11, 14].entries()) this.tone(midi(55 + n), 1.6, 0.07, "sine", 1, i * 0.2); break;
      case "room.enter": this.rustle(0.15, 0.06, 2000, 0.6); break;
    }
  }

  haptic(e: SimEvent): void {
    const pulse = (ms: number | number[]) => {
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* unsupported */
      }
      for (const p of navigator.getGamepads?.() ?? []) {
        const act = p?.vibrationActuator as unknown as { playEffect?: (t: string, o: object) => Promise<unknown> } | undefined;
        const d = Array.isArray(ms) ? ms[0]! : ms;
        void act?.playEffect?.("dual-rumble", { duration: d, strongMagnitude: Math.min(1, d / 180), weakMagnitude: 0.3 }).catch(() => undefined);
      }
    };
    switch (e.id) {
      case "enemy.hit": pulse(e.heavy ? 70 : 30); break;
      case "parry": pulse(70); break;
      case "crease.take": pulse([45, 30, 45]); break;
      case "item.bury": pulse(120); break;
      case "landmark.harvest": pulse(100); break;
      case "guardian.phase": case "guardian.fall": pulse(180); break;
      case "torn": pulse(600); break;
    }
  }
}
