import { BrowserInputSource, InputManager, type InputBinding } from "@slu/web-shell";
import { NO_INPUT, type Input } from "../sim/sim.ts";

// One semantic layer over keyboard, gamepad and touch (GDD §8). The sim only ever sees `Input`.
export type Action =
  | "left" | "right" | "up" | "down" | "jump" | "slide" | "v1" | "v2" | "v3" | "act"
  | "pick1" | "pick2" | "pick3" | "pause" | "confirm" | "back";

const BINDINGS: InputBinding[] = [
  { action: "left", keyboard: ["KeyA", "ArrowLeft"], gamepadButtons: [14], gamepadAxes: [{ axis: 0, direction: -1, threshold: 0.2 }] },
  { action: "right", keyboard: ["KeyD", "ArrowRight"], gamepadButtons: [15], gamepadAxes: [{ axis: 0, direction: 1, threshold: 0.2 }] },
  { action: "up", keyboard: ["KeyW", "ArrowUp"], gamepadButtons: [12], gamepadAxes: [{ axis: 1, direction: -1, threshold: 0.6 }] },
  { action: "down", keyboard: ["KeyS", "ArrowDown"], gamepadButtons: [13], gamepadAxes: [{ axis: 1, direction: 1, threshold: 0.6 }] },
  { action: "jump", keyboard: ["Space"], gamepadButtons: [0] },
  { action: "slide", keyboard: ["ShiftLeft", "ShiftRight"], gamepadButtons: [1] },
  { action: "v1", keyboard: ["KeyJ"], gamepadButtons: [2] },
  { action: "v2", keyboard: ["KeyK"], gamepadButtons: [3] },
  { action: "v3", keyboard: ["KeyL"], gamepadButtons: [5, 7] },
  { action: "act", keyboard: ["KeyE"], gamepadButtons: [4, 6] },
  { action: "pick1", keyboard: ["Digit1", "Numpad1"] },
  { action: "pick2", keyboard: ["Digit2", "Numpad2"] },
  { action: "pick3", keyboard: ["Digit3", "Numpad3"] },
  { action: "pause", keyboard: ["Escape", "KeyP"], gamepadButtons: [9] },
  { action: "confirm", keyboard: ["Enter", "NumpadEnter"], gamepadButtons: [0] },
  { action: "back", keyboard: ["Backspace"], gamepadButtons: [1] },
];

export type Family = "keyboard" | "gamepad" | "touch";

export class GameInput {
  private readonly shell = new InputManager();
  private readonly source = new BrowserInputSource(BINDINGS);
  readonly touch = new TouchControls();
  private fam: Family = "keyboard";
  private padWasActive = false;
  /** Keys pressed since the last poll, so a tap shorter than a frame still registers for one frame. */
  private readonly latched = new Set<string>();
  onFamily: ((f: Family) => void) | null = null;

  constructor() {
    this.shell.setBindings(BINDINGS);
    this.source.attach(window);
    addEventListener("keydown", (e) => {
      if (!e.repeat) this.latched.add(e.code);
      // Menus activate through the semantic layer only, so a native Enter/Space click never doubles a press.
      if (["Space", "Enter", "NumpadEnter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
      this.family = "keyboard";
    });
    addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") this.family = "touch";
    }, { passive: true });
  }

  get family(): Family {
    return this.fam;
  }
  set family(f: Family) {
    if (f === this.fam) return;
    this.fam = f;
    document.documentElement.dataset.input = f;
    this.touch.show(f === "touch");
    this.onFamily?.(f);
  }

  /** Poll devices once per rendered frame. */
  poll(): void {
    const raw = this.source.poll();
    const t = this.touch.state;
    const merge = (a: Action, v: number) => raw.set(a, Math.max(raw.get(a) ?? 0, v));
    merge("left", t.x < -0.2 ? -t.x : 0);
    merge("right", t.x > 0.2 ? t.x : 0);
    merge("down", t.y < -0.6 ? 1 : 0);
    merge("up", t.y > 0.6 ? 1 : 0);
    merge("jump", t.jump ? 1 : 0);
    merge("slide", t.slide ? 1 : 0);
    merge("v1", t.verb[0] ? 1 : 0);
    merge("v2", t.verb[1] ? 1 : 0);
    merge("v3", t.verb[2] ? 1 : 0);
    merge("act", t.act ? 1 : 0);
    merge("pause", t.pause ? 1 : 0);
    t.pause = false;
    for (const a of this.touch.tapped) raw.set(a, 1);
    this.touch.tapped.clear();
    if (this.latched.size) {
      for (const b of BINDINGS) if (b.keyboard?.some((k) => this.latched.has(k))) raw.set(b.action, Math.max(raw.get(b.action) ?? 0, 1));
      this.latched.clear();
    }
    const pads = navigator.getGamepads?.() ?? [];
    const padActive = pads.some((p) => p && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.4)));
    if (padActive && !this.padWasActive) this.family = "gamepad";
    this.padWasActive = padActive;
    this.shell.update(raw);
  }

  pressed(a: Action): boolean {
    return this.shell.wasPressed(a);
  }
  down(a: Action): boolean {
    return this.shell.isDown(a);
  }

  /** The sim's input for this tick. Full speed above 0.5 on a stick (GDD §8). */
  read(): Input {
    const s = this.shell;
    const ax = s.value("right") - s.value("left");
    const x = Math.abs(ax) < 0.2 ? 0 : Math.sign(ax) * Math.min(1, Math.abs(ax) / 0.5);
    const pick = s.isDown("pick1") ? 1 : s.isDown("pick2") ? 2 : s.isDown("pick3") ? 3 : this.touch.state.pick;
    return {
      x,
      up: s.isDown("up"),
      down: s.isDown("down"),
      jump: s.isDown("jump"),
      slide: s.isDown("slide"),
      verb: [s.isDown("v1"), s.isDown("v2"), s.isDown("v3")],
      act: s.isDown("act"),
      pick,
    };
  }

  static none(): Input {
    return { ...NO_INPUT, verb: [false, false, false] };
  }
}

/** Landscape touch layout: floating left pad, right-thumb jump/slide/verb arc/bury (GDD §8). */
export class TouchControls {
  readonly root: HTMLDivElement;
  readonly state = { x: 0, y: 0, jump: false, slide: false, verb: [false, false, false] as [boolean, boolean, boolean], act: false, pause: false, pick: 0 };
  /** Buttons pressed since the last poll, so a tap shorter than a frame still registers for one frame. */
  readonly tapped = new Set<Action>();
  private padId = -1;
  private padX = 0;
  private padY = 0;
  private readonly knob: HTMLDivElement;
  private readonly base: HTMLDivElement;
  readonly verbButtons: HTMLButtonElement[] = [];
  readonly actButton: HTMLButtonElement;

  constructor() {
    const root = document.createElement("div");
    root.className = "touch";
    root.hidden = true;
    root.innerHTML = `
      <div class="t-pad"><div class="t-base"></div><div class="t-knob"></div></div>
      <button class="t-btn t-pause" aria-label="Pause">❚❚</button>
      <div class="t-right">
        <button class="t-btn t-act" aria-label="Bury or take">E</button>
        <button class="t-btn t-verb" data-v="0" aria-label="Keepsake 1"></button>
        <button class="t-btn t-verb" data-v="1" aria-label="Keepsake 2"></button>
        <button class="t-btn t-verb" data-v="2" aria-label="Keepsake 3"></button>
        <button class="t-btn t-slide" aria-label="Slide">⤵</button>
        <button class="t-btn t-jump" aria-label="Jump">⤒</button>
      </div>`;
    this.root = root;
    this.base = root.querySelector(".t-base")!;
    this.knob = root.querySelector(".t-knob")!;
    const pad = root.querySelector<HTMLDivElement>(".t-pad")!;
    pad.addEventListener("pointerdown", (e) => {
      this.padId = e.pointerId;
      this.padX = e.clientX;
      this.padY = e.clientY;
      try {
        pad.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointer */
      }
      this.placeBase(e.clientX, e.clientY);
      this.moveKnob(e.clientX, e.clientY);
    });
    pad.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.padId) this.moveKnob(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.padId) return;
      this.padId = -1;
      this.state.x = this.state.y = 0;
      this.base.style.opacity = this.knob.style.opacity = "0";
    };
    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
    const hold = (sel: string, set: (v: boolean) => void, action: Action) => {
      for (const b of root.querySelectorAll<HTMLButtonElement>(sel)) {
        b.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          try {
            b.setPointerCapture(e.pointerId);
          } catch {
            /* synthetic or already-released pointer */
          }
          this.tapped.add(action);
          b.classList.add("on");
          set(true);
        });
        const up = () => {
          b.classList.remove("on");
          set(false);
        };
        b.addEventListener("pointerup", up);
        b.addEventListener("pointercancel", up);
        b.addEventListener("lostpointercapture", up);
      }
    };
    hold(".t-jump", (v) => (this.state.jump = v), "jump");
    hold(".t-slide", (v) => (this.state.slide = v), "slide");
    hold(".t-act", (v) => (this.state.act = v), "act");
    for (const b of root.querySelectorAll<HTMLButtonElement>(".t-verb")) {
      const i = Number(b.dataset.v);
      this.verbButtons.push(b);
      hold(`.t-verb[data-v="${i}"]`, (v) => {
        this.state.verb[i] = v;
        // While holding bury, a verb tap picks the slot instead (GDD §8 touch: the arc highlights the slot).
        this.state.pick = v && this.state.act ? i + 1 : 0;
      }, `v${i + 1}` as Action);
    }
    this.actButton = root.querySelector(".t-act")!;
    root.querySelector(".t-pause")!.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.state.pause = true;
    });
    root.addEventListener("contextmenu", (e) => e.preventDefault());
    document.body.appendChild(root);
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  private placeBase(x: number, y: number): void {
    this.base.style.transform = `translate(${x - 60}px, ${y - 60}px)`;
    this.base.style.opacity = "1";
  }

  private moveKnob(x: number, y: number): void {
    let dx = x - this.padX, dy = y - this.padY;
    const d = Math.hypot(dx, dy), max = 52;
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    this.knob.style.transform = `translate(${this.padX + dx - 26}px, ${this.padY + dy - 26}px)`;
    this.knob.style.opacity = "1";
    this.state.x = dx / max;
    this.state.y = -dy / max;
  }
}
