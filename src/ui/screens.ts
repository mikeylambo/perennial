// Screens (GDD §20): title, pause with settings, the Hearth with its letter line, results. Paper tags; controller-first focus.
import { isKeepsake, itemName } from "../data/content.ts";
import { iconSvg } from "../render/icons.ts";
import type { Sim } from "../sim/sim.ts";

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  shake: number;
  reduceMotion: boolean;
  reduceFlash: boolean;
  quality: "low" | "medium" | "high";
  prompts: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { master: 0.8, music: 0.6, sfx: 0.9, shake: 1, reduceMotion: false, reduceFlash: false, quality: "medium", prompts: true, haptics: true };

const ROMAN = ["", "I", "II", "III", "IV"];

export type ScreenId = "title" | "pause" | "settings" | "hearth" | "results" | "confirm" | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export class Screens {
  readonly root: HTMLDivElement;
  current: ScreenId = null;
  private back: (() => void) | null = null;
  private openedAt = 0;
  onSound: ((k: "tap" | "flip" | "back") => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "screens";
    parent.appendChild(this.root);
    this.root.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("button")) this.onSound?.("tap");
    });
  }

  private open(id: ScreenId, html: string, back: (() => void) | null, cls = ""): HTMLElement {
    this.current = id;
    this.back = back;
    this.openedAt = performance.now();
    this.root.innerHTML = `<div class="screen ${cls}" data-screen="${id}">${html}</div>`;
    this.root.hidden = false;
    this.onSound?.("flip");
    const el = this.root.firstElementChild as HTMLElement;
    requestAnimationFrame(() => el.querySelector<HTMLElement>("[data-nav]")?.focus({ preventScroll: true }));
    return el;
  }

  close(): void {
    this.current = null;
    this.back = null;
    this.root.innerHTML = "";
    this.root.hidden = true;
  }

  /** 0.25 s guard so a gameplay press can't confirm a just-opened menu (GDD §8). */
  get guarded(): boolean {
    return performance.now() - this.openedAt < 250;
  }

  nav(dir: -1 | 1): void {
    const items = [...this.root.querySelectorAll<HTMLElement>("[data-nav]")].filter((el) => !(el as HTMLButtonElement).disabled);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + dir + items.length) % items.length]!.focus({ preventScroll: true });
    this.onSound?.("tap");
  }

  /** Left/right on a focused slider or toggle. */
  adjust(dir: -1 | 1): void {
    const el = document.activeElement as HTMLInputElement | null;
    if (el?.type === "range") {
      el.value = String(Number(el.value) + dir * Number(el.step || 0.1));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (el?.tagName === "SELECT") {
      const s = el as unknown as HTMLSelectElement;
      s.selectedIndex = Math.max(0, Math.min(s.options.length - 1, s.selectedIndex + dir));
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  confirm(): void {
    if (this.guarded) return;
    const el = document.activeElement as HTMLElement | null;
    if (el && this.root.contains(el)) {
      if ((el as HTMLInputElement).type === "checkbox") (el as HTMLInputElement).click();
      else if (el.tagName === "BUTTON") el.click();
    }
  }

  goBack(): void {
    if (this.guarded || !this.back) return;
    this.onSound?.("back");
    this.back();
  }

  title(best: { score: number; years: number } | null, onBegin: () => void, onSettings: () => void): void {
    const el = this.open(
      "title",
      `<div class="title-card">
        <h1>Perennial</h1>
        <p class="sub">Bury what you love before the winter. Climb what it becomes.</p>
        <div class="menu">
          <button data-nav class="tag big" data-act="begin">Begin the year</button>
          <button data-nav class="tag" data-act="settings">Settings</button>
        </div>
        ${best ? `<p class="best">Best: ${best.score} · ${best.years} ${best.years === 1 ? "year" : "years"} kept</p>` : ""}
        <p class="keys"><span data-for="keyboard">A D run · Space jump · Shift slide · J K L keepsakes · hold E bury · Esc pause</span><span data-for="gamepad">Stick run · Ⓐ jump · Ⓑ slide · Ⓧ Ⓨ RB keepsakes · hold LB bury · Start pause</span><span data-for="touch">Left thumb runs · right thumb jumps, slides and uses keepsakes · hold E to bury</span></p>
        <p class="phase">Phase 0 · Emberfell, one face, three years</p>
      </div>`,
      null,
      "title",
    );
    el.querySelector('[data-act="begin"]')!.addEventListener("click", onBegin);
    el.querySelector('[data-act="settings"]')!.addEventListener("click", onSettings);
  }

  pause(onResume: () => void, onSettings: () => void, onAbandon: () => void): void {
    const el = this.open(
      "pause",
      `<div class="card"><h2>Paused</h2><div class="menu">
        <button data-nav class="tag big" data-act="resume">Resume</button>
        <button data-nav class="tag" data-act="settings">Settings</button>
        <button data-nav class="tag" data-act="abandon">Abandon run</button>
      </div></div>`,
      onResume,
    );
    el.querySelector('[data-act="resume"]')!.addEventListener("click", onResume);
    el.querySelector('[data-act="settings"]')!.addEventListener("click", onSettings);
    el.querySelector('[data-act="abandon"]')!.addEventListener("click", () => this.confirmBox("Abandon this run? Years you finished still count.", onAbandon, () => this.pause(onResume, onSettings, onAbandon)));
  }

  confirmBox(text: string, yes: () => void, no: () => void): void {
    const el = this.open("confirm", `<div class="card"><p>${esc(text)}</p><div class="menu row"><button data-nav class="tag" data-act="no">Keep going</button><button data-nav class="tag" data-act="yes">Abandon</button></div></div>`, no);
    el.querySelector('[data-act="yes"]')!.addEventListener("click", yes);
    el.querySelector('[data-act="no"]')!.addEventListener("click", no);
  }

  settings(s: Settings, onChange: (s: Settings) => void, onBack: () => void): void {
    const slider = (k: keyof Settings, label: string, max = 1) => `<label class="row"><span>${label}</span><input data-nav type="range" min="0" max="${max}" step="0.1" value="${s[k] as number}" data-k="${k}"></label>`;
    const toggle = (k: keyof Settings, label: string) => `<label class="row"><span>${label}</span><input data-nav type="checkbox" ${s[k] ? "checked" : ""} data-k="${k}"></label>`;
    const el = this.open(
      "settings",
      `<div class="card wide"><h2>Settings</h2>
        ${slider("master", "Volume")}${slider("music", "Music")}${slider("sfx", "Sounds")}${slider("shake", "Screen shake")}
        ${toggle("reduceMotion", "Reduce motion")}${toggle("reduceFlash", "Reduce flashes")}${toggle("prompts", "Show button prompts")}${toggle("haptics", "Vibration")}
        <label class="row"><span>Quality</span><select data-nav data-k="quality">${["low", "medium", "high"].map((q) => `<option ${q === s.quality ? "selected" : ""}>${q}</option>`).join("")}</select></label>
        <div class="menu"><button data-nav class="tag" data-act="back">Back</button></div>
      </div>`,
      onBack,
    );
    const changed = (e: Event) => {
      const t = e.target as HTMLInputElement;
      const k = t.dataset.k as keyof Settings | undefined;
      if (!k) return;
      const next = { ...s, [k]: t.type === "checkbox" ? t.checked : t.type === "range" ? Number(t.value) : t.value } as Settings;
      Object.assign(s, next);
      onChange(s);
    };
    el.addEventListener("input", changed);
    el.addEventListener("change", changed);
    el.querySelector('[data-act="back"]')!.addEventListener("click", onBack);
  }

  hearth(sim: Sim, line: string, onContinue: () => void): void {
    const year = sim.year;
    const yearBurials = sim.stats.burials.filter((b) => b.year === year);
    const harvested = sim.landmarks.filter((l) => l.plot.landmark?.harvested).length;
    const last = year >= 3;
    const pack = sim.pack.slots.map((s) => (s ? `<span class="chip">${iconSvg(s.id, 22)}${esc(itemName(s))}</span>` : `<span class="chip empty">empty</span>`)).join("");
    const el = this.open(
      "hearth",
      `<div class="card letter">
        <h2>The Hearth</h2>
        <p class="year">Year ${year} of 3</p>
        <blockquote>${esc(line)}</blockquote>
        <p class="summary">${yearBurials.length ? `You buried ${yearBurials.length} ${yearBurials.length === 1 ? "thing" : "things"} and climbed ${harvested} ${harvested === 1 ? "landmark" : "landmarks"}.` : "You buried nothing this year. The mountain stayed as it was."}</p>
        <div class="pack-row">${pack}</div>
        <div class="menu"><button data-nav class="tag big" data-act="go">${last ? "Close the letter" : "Go down again"}</button></div>
      </div>`,
      null,
    );
    el.querySelector('[data-act="go"]')!.addEventListener("click", onContinue);
  }

  results(sim: Sim, outcome: "torn" | "done" | "abandon", best: number, onRetry: () => void, onTitle: () => void): void {
    const st = sim.stats;
    const score = sim.score();
    const grade = score >= 4800 ? "S" : score >= 3600 ? "A" : score >= 2400 ? "B" : score >= 1200 ? "C" : "D";
    const head = outcome === "done" ? "Three springs" : outcome === "torn" ? "Torn" : "Left the mountain";
    const lines = st.burials.length
      ? st.burials
          .map((b) => {
            const it = b.item;
            const grew = isKeepsake(it.id) ? `grew to ${ROMAN[b.grows]}` : "rotted to a stump";
            return `<li>${iconSvg(it.id, 20)}<span>Year ${b.year}: ${esc(itemName(it))} in ${esc(b.room)}, ${grew}${b.best ? " <em>(your best)</em>" : ""}${b.beforeGuardian ? "" : ""}</span></li>`;
          })
          .join("")
      : `<li><span>You never buried anything.</span></li>`;
    const el = this.open(
      "results",
      `<div class="card wide results">
        <h2>${head}</h2>
        <div class="grade">${grade}</div>
        <p class="score">${score}${score >= best && score > 0 ? " · new best" : ` · best ${best}`}</p>
        <div class="stats"><span>${st.yearsDone} of 3 years</span><span>${st.tiersGrown} ${st.tiersGrown === 1 ? "tier" : "tiers"} grown</span><span>tallest ${ROMAN[st.tallest] || "none"}</span><span>${st.creasesLost} creases lost</span></div>
        <h3>What you buried</h3>
        <ul class="burials">${lines}</ul>
        <div class="menu row"><button data-nav class="tag big" data-act="retry">Climb again</button><button data-nav class="tag" data-act="title">Title</button></div>
      </div>`,
      onTitle,
    );
    el.querySelector('[data-act="retry"]')!.addEventListener("click", onRetry);
    el.querySelector('[data-act="title"]')!.addEventListener("click", onTitle);
  }
}
