// The HUD budget (GDD §21): three pack tabs, a guardian strip, a room tag, the bury ring, a pickup name tag
// and first-time glyph prompts that retire once used. Creases and damp live on Folio, never here.
import * as THREE from "three";
import { isKeepsake, itemName } from "../data/content.ts";
import { iconSvg } from "../render/icons.ts";
import type { Sim, SimEvent } from "../sim/sim.ts";
import type { Family } from "./input.ts";

const ROMAN = ["", "I", "II", "III", "IV"];

type PromptId = "move" | "jump" | "take" | "bury" | "verb" | "harvest" | "climb";

const GLYPHS: Record<Family, Record<string, string>> = {
  keyboard: { move: "A D", jump: "Space", act: "E", hold: "Hold E", verb: "J K L", pick: "1 2 3" },
  gamepad: { move: "Stick", jump: "Ⓐ", act: "LB", hold: "Hold LB", verb: "Ⓧ Ⓨ RB", pick: "D-pad" },
  touch: { move: "Left thumb", jump: "⤒", act: "E", hold: "Hold E", verb: "Arc", pick: "Arc" },
};

export class Hud {
  readonly root: HTMLDivElement;
  private readonly tabs: HTMLDivElement;
  private readonly tag: HTMLDivElement;
  private readonly name: HTMLDivElement;
  private readonly strip: HTMLDivElement;
  private readonly stripFill: HTMLDivElement;
  private readonly ring: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private tagT = 0;
  private nameT = 0;
  private packKey = "";
  private readonly retired = new Set<PromptId>();
  family: Family = "keyboard";
  showPrompts = true;

  constructor(parent: HTMLElement) {
    const root = document.createElement("div");
    root.className = "hud";
    root.innerHTML = `
      <div class="hud-tag tag" hidden></div>
      <div class="hud-strip" hidden><div class="hud-strip-fill"></div></div>
      <div class="hud-name tag" hidden></div>
      <div class="hud-ring" hidden><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" class="track"/><circle cx="20" cy="20" r="16" class="fill" pathLength="100"/></svg></div>
      <div class="hud-prompt" hidden></div>
      <div class="hud-tabs"></div>`;
    parent.appendChild(root);
    this.root = root;
    this.tabs = root.querySelector(".hud-tabs")!;
    this.tag = root.querySelector(".hud-tag")!;
    this.name = root.querySelector(".hud-name")!;
    this.strip = root.querySelector(".hud-strip")!;
    this.stripFill = root.querySelector(".hud-strip-fill")!;
    this.ring = root.querySelector(".hud-ring")!;
    this.prompt = root.querySelector(".hud-prompt")!;
  }

  show(on: boolean): void {
    this.root.hidden = !on;
  }

  reset(): void {
    this.packKey = "";
    this.tagT = this.nameT = 0;
    this.tag.hidden = this.name.hidden = true;
  }

  retire(id: PromptId): void {
    this.retired.add(id);
  }

  handle(events: SimEvent[], sim: Sim): void {
    for (const e of events) {
      switch (e.id) {
        case "room.enter": {
          const band = e.band === "hearth" ? "Hearth" : e.band === "floor" ? "Guardian floor" : sim.world.spring ? "Spring" : e.band === "winter" ? "Winter" : "Autumn";
          this.showTag(`Year ${sim.year} · ${band} · ${e.name as string}`);
          break;
        }
        case "year.start":
          this.showTag(`Year ${sim.year} · Emberfell`);
          break;
        case "climb.start":
          this.showTag(`Year ${sim.year} · Spring`);
          this.retire("verb");
          break;
        case "item.pickup":
          this.showName(e.name as string);
          this.retire("take");
          break;
        case "landmark.harvest":
          this.showName(e.name as string);
          this.retire("harvest");
          break;
        case "item.bury":
          this.retire("bury");
          break;
        case "verb.use":
          this.retire("verb");
          break;
        case "move.jump":
          this.retire("jump");
          this.retire("move");
          break;
      }
    }
  }

  private showTag(text: string): void {
    this.tag.textContent = text;
    this.tag.hidden = false;
    this.tag.classList.remove("fold");
    void this.tag.offsetWidth;
    this.tag.classList.add("fold");
    this.tagT = 2.2;
  }

  private showName(text: string): void {
    this.name.textContent = text;
    this.name.hidden = false;
    this.name.classList.remove("fold");
    void this.name.offsetWidth;
    this.name.classList.add("fold");
    this.nameT = 1.4;
  }

  update(dt: number, sim: Sim, camera: THREE.Camera, fx: number, fy: number): void {
    // Pack tabs.
    const key = sim.pack.slots.map((s) => (s ? `${s.id}:${s.tier}` : "-")).join("|") + `#${sim.pack.selected}#${sim.hold ? 1 : 0}#${this.family}`;
    if (key !== this.packKey) {
      this.packKey = key;
      const keys = this.family === "gamepad" ? ["Ⓧ", "Ⓨ", "RB"] : this.family === "touch" ? ["", "", ""] : ["J", "K", "L"];
      this.tabs.innerHTML = sim.pack.slots
        .map((s, i) => {
          const sel = sim.hold && i === sim.pack.selected ? " sel" : "";
          if (!s) return `<div class="tab empty${sel}"><span class="key">${keys[i]}</span></div>`;
          const pips = isKeepsake(s.id) ? `<span class="pips">${ROMAN[s.tier]}</span>` : `<span class="pips scrap">scrap</span>`;
          return `<div class="tab${sel}" title="${itemName(s)}">${iconSvg(s.id, 34)}${pips}<span class="key">${keys[i]}</span></div>`;
        })
        .join("");
      // Touch: the verb arc wears the same silhouettes.
      document.querySelectorAll<HTMLButtonElement>(".t-verb").forEach((b, i) => {
        const s = sim.pack.slots[i];
        b.innerHTML = s ? iconSvg(s.id, 30) : "";
        b.classList.toggle("sel", !!sim.hold && i === sim.pack.selected);
      });
    }
    const actBtn = document.querySelector<HTMLButtonElement>(".t-act");
    if (actBtn) actBtn.classList.toggle("live", !!sim.near);

    if (this.tagT > 0 && (this.tagT -= dt) <= 0) this.tag.hidden = true;
    if (this.nameT > 0 && (this.nameT -= dt) <= 0) this.name.hidden = true;

    // Guardian strip: boss health as crease marks.
    const g = sim.phase === "guardian";
    this.strip.hidden = !g;
    if (g && sim.guardianMax > 0) this.stripFill.style.transform = `scaleX(${Math.max(0, sim.guardianHp / sim.guardianMax)})`;

    // Bury ring around the plot.
    const w = this.root.clientWidth, h = this.root.clientHeight;
    const project = (x: number, y: number) => {
      const v = new THREE.Vector3(x, y, 0.4).project(camera);
      return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h] as const;
    };
    if (sim.hold && sim.near) {
      const [sx, sy] = project(sim.near.x, sim.near.y + 0.6);
      this.ring.hidden = false;
      this.ring.style.transform = `translate(${sx - 24}px, ${sy - 24}px)`;
      (this.ring.querySelector(".fill") as SVGCircleElement).style.strokeDasharray = `${Math.min(1, sim.hold.t) * 100} 100`;
    } else this.ring.hidden = true;

    // First-time prompts: one at a time, beside Folio, gone after the action is performed once.
    const p = this.pickPrompt(sim);
    if (p && this.showPrompts) {
      const [sx, sy] = sim.near && (p.id === "take" || p.id === "bury" || p.id === "harvest") ? project(sim.near.x, sim.near.y + 1.6) : project(fx, fy + 1.8);
      this.prompt.hidden = false;
      if (this.prompt.dataset.id !== p.id + this.family) {
        this.prompt.dataset.id = p.id + this.family;
        this.prompt.innerHTML = p.html;
      }
      this.prompt.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    } else this.prompt.hidden = true;
  }

  private pickPrompt(sim: Sim): { id: PromptId; html: string } | null {
    const G = GLYPHS[this.family];
    const kbd = (s: string) => `<kbd>${s}</kbd>`;
    const want = (id: PromptId) => !this.retired.has(id);
    if (sim.phase !== "descent" && sim.phase !== "climb") return null;
    const near = sim.near;
    if (near?.kind === "find" && want("take")) return { id: "take", html: `${kbd(G.act!)} take` };
    if (near?.kind === "bloom" && want("harvest")) return { id: "harvest", html: `${kbd(G.act!)} harvest` };
    if (near?.kind === "plot" && !sim.pack.empty && want("bury") && sim.phase === "descent")
      return { id: "bury", html: `${kbd(G.hold!)} bury · ${kbd(G.pick!)} choose` };
    if (sim.yearTime < 8 && sim.year === 1 && want("move")) return { id: "move", html: `${kbd(G.move!)} run · ${kbd(G.jump!)} jump` };
    if (!sim.pack.empty && sim.pack.slots.some((s) => s && isKeepsake(s.id)) && want("verb") && sim.year === 1) return { id: "verb", html: `${kbd(G.verb!)} use` };
    return null;
  }
}
