// Folio: a jointed paper puppet folded from a letter (art bible §3). Hinged cuts plus three swapped forms:
// flat (dodge), dart (glide) and a crumpled ball. Creases show on the body; damp darkens and sags it.
import * as THREE from "three";
import type { Item } from "../data/content.ts";
import type { Sim } from "../sim/sim.ts";
import { ICONS, ICON_COLOR } from "./icons.ts";
import { C, mat, mesh, poly, slab } from "./paper.ts";

export class FolioPuppet {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly body: THREE.Group;
  private readonly head: THREE.Mesh;
  private readonly legs: THREE.Group[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly scarf: THREE.Group;
  private readonly scarfTail: THREE.Mesh;
  private readonly ball: THREE.Mesh;
  private readonly dart: THREE.Mesh;
  private readonly letter: THREE.MeshStandardMaterial;
  private readonly creaseLines: THREE.Mesh[] = [];
  private readonly packIcons: THREE.Group;
  private packKey = "";
  private readonly blade: THREE.Group;
  private readonly shield: THREE.Group;
  private readonly lanternLight: THREE.PointLight;
  private walk = 0;
  private flicker = 0;

  constructor() {
    const letter = mat("#f3ece0");
    this.letter = letter;
    const ink = mat("#6b5a46");
    // Torso: a folded sheet, slightly wider at the shoulders, with handwriting lines.
    this.body = new THREE.Group();
    this.body.position.y = 0.3;
    const torso = mesh(slab(poly([[-0.2, 0], [0.2, 0], [0.26, 0.42], [0.04, 0.52], [-0.24, 0.44]]), 0.05), letter);
    this.body.add(torso);
    for (let i = 0; i < 3; i++) {
      const l = mesh(slab(poly([[-0.15, 0.1 + i * 0.11], [0.15, 0.12 + i * 0.11], [0.15, 0.13 + i * 0.11], [-0.15, 0.11 + i * 0.11]]), 0.005), ink, false);
      l.position.z = 0.052;
      this.body.add(l);
    }
    // Creases appear one per lost crease.
    const crease = mat("#8c7a62");
    const lines: Array<Array<[number, number]>> = [
      [[-0.2, 0.05], [0.22, 0.4], [0.21, 0.42], [-0.21, 0.07]],
      [[0.2, 0.08], [-0.22, 0.36], [-0.23, 0.34], [0.19, 0.06]],
      [[-0.02, 0.0], [0.02, 0.5], [0.0, 0.5], [-0.04, 0.0]],
      [[-0.24, 0.25], [0.25, 0.22], [0.25, 0.24], [-0.24, 0.27]],
    ];
    for (const p of lines) {
      const m = mesh(slab(poly(p), 0.004), crease, false);
      m.position.z = 0.056;
      m.visible = false;
      this.body.add(m);
      this.creaseLines.push(m);
    }
    // Head: a folded square, point up.
    this.head = mesh(slab(poly([[0, 0], [0.19, 0.16], [0.02, 0.38], [-0.17, 0.18]]), 0.05), letter);
    this.head.position.set(0.02, 0.8, 0.01);
    const eye = mesh(slab(new THREE.Shape().absarc(0.06, 0.2, 0.025, 0, Math.PI * 2, false), 0.01), mat("#2a2730"), false);
    eye.position.z = 0.055;
    this.head.add(eye);
    // Scarf: the one constant warm accent (art bible §2).
    const red = mat("#c8572a");
    this.scarf = new THREE.Group();
    this.scarf.position.set(0, 0.76, 0.06);
    this.scarf.add(mesh(slab(poly([[-0.2, -0.04], [0.22, -0.04], [0.2, 0.06], [-0.2, 0.06]]), 0.03), red));
    this.scarfTail = mesh(slab(poly([[0, 0], [-0.42, -0.05], [-0.4, -0.13], [0, -0.09]]), 0.02), red);
    this.scarfTail.position.set(-0.15, 0.03, 0);
    this.scarf.add(this.scarfTail);
    // Limbs on hinges.
    for (let i = 0; i < 2; i++) {
      const leg = new THREE.Group();
      leg.position.set(i ? 0.08 : -0.08, 0.32, i ? 0.03 : -0.03);
      leg.add(mesh(slab(poly([[-0.045, 0], [0.045, 0], [0.04, -0.32], [0.09, -0.34], [0.08, -0.38], [-0.05, -0.38]]), 0.03), letter));
      this.legs.push(leg);
      const arm = new THREE.Group();
      arm.position.set(i ? 0.18 : -0.18, 0.72, i ? 0.06 : -0.06);
      arm.add(mesh(slab(poly([[-0.035, 0], [0.035, 0], [0.03, -0.32], [-0.03, -0.32]]), 0.03), letter));
      this.arms.push(arm);
    }
    // Held verbs: a blade in the front hand, a shield on the back arm.
    this.blade = new THREE.Group();
    this.blade.add(mesh(slab(poly([[-0.04, -0.05], [0.04, -0.05], [0.05, 0.62], [0, 0.78], [-0.05, 0.62]]), 0.02), mat("#e0ad48", { emissive: new THREE.Color("#3a1a00"), emissiveIntensity: 0.4 })));
    this.blade.add(mesh(slab(poly([[-0.14, -0.02], [0.14, -0.02], [0.14, 0.03], [-0.14, 0.03]]), 0.03), mat("#8a4b26")));
    this.blade.position.set(0, -0.3, 0.03);
    this.blade.visible = false;
    this.arms[1]!.add(this.blade);
    this.shield = new THREE.Group();
    const sp: Array<[number, number]> = ICONS["ks.shield"].map(([x, y]) => [x * 0.62, y * 0.62]);
    this.shield.add(mesh(slab(poly(sp), 0.04), mat("#5d7f3e")));
    this.shield.position.set(0.12, -0.25, 0.12);
    this.shield.visible = false;
    this.arms[1]!.add(this.shield);
    this.rig.add(this.legs[0]!, this.arms[0]!, this.body, this.head, this.scarf, this.legs[1]!, this.arms[1]!);
    // Pack: the three keepsakes ride on Folio's back as small cut icons.
    this.packIcons = new THREE.Group();
    this.packIcons.position.set(-0.22, 0.5, -0.07);
    this.rig.add(this.packIcons);
    // Swapped forms.
    const ballGeo = new THREE.IcosahedronGeometry(0.34, 1);
    const pos = ballGeo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const k = 0.82 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
    }
    ballGeo.computeVertexNormals();
    this.ball = mesh(ballGeo, new THREE.MeshStandardMaterial({ color: "#f3ece0", roughness: 0.9, flatShading: true }));
    this.ball.position.y = 0.35;
    this.ball.visible = false;
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.Float32BufferAttribute([0.45, 0, 0, -0.35, 0.05, 0.3, -0.25, -0.05, 0, 0.45, 0, 0, -0.25, -0.05, 0, -0.35, 0.05, -0.3], 3));
    dg.computeVertexNormals();
    this.dart = mesh(dg, letter);
    this.dart.position.y = 0.45;
    this.dart.visible = false;
    this.root.add(this.rig, this.ball, this.dart);
    this.lanternLight = new THREE.PointLight(0xffb050, 0, 6, 1);
    this.lanternLight.position.set(0.3, 0.6, 0.6);
    this.root.add(this.lanternLight);
  }

  private setPack(slots: Array<Item | null>): void {
    const key = slots.map((s) => (s ? `${s.id}:${s.tier}` : "-")).join("|");
    if (key === this.packKey) return;
    this.packKey = key;
    this.packIcons.clear();
    slots.forEach((s, i) => {
      if (!s) return;
      const pts = ICONS[s.id].map(([x, y]): [number, number] => [x * 0.3, y * 0.3]);
      const m = mesh(slab(poly(pts), 0.02), mat(ICON_COLOR[s.id]));
      m.position.set(-i * 0.05, -i * 0.17, -i * 0.01);
      m.rotation.z = 0.3 - i * 0.25;
      this.packIcons.add(m);
    });
  }

  update(sim: Sim, x: number, y: number, dt: number, time: number): void {
    const b = sim.body;
    this.root.position.set(x, y, 0.35);
    this.setPack(sim.pack.slots);
    const form = b.form;
    this.rig.visible = form === "stand" || form === "flat";
    this.ball.visible = form === "ball";
    this.dart.visible = form === "dart";
    this.rig.scale.set(b.facing * (form === "flat" ? 1.5 : 1), form === "flat" ? 0.28 : 1, 1);
    this.dart.scale.x = b.facing;
    this.dart.rotation.z = Math.max(-0.4, Math.min(0.3, b.vy * 0.06)) * b.facing;
    if (form === "ball") {
      this.ball.rotation.z -= (b.vx * dt) / 0.34;
    }
    // Run cycle on hinges; a held pose while airborne.
    const speed = Math.abs(b.vx);
    if (b.grounded && speed > 0.3) this.walk += dt * (6 + speed * 1.6);
    else this.walk *= 0.9;
    const sw = b.grounded ? Math.sin(this.walk) * Math.min(1, speed / 4) * 0.7 : 0.35;
    this.legs[0]!.rotation.z = sw;
    this.legs[1]!.rotation.z = b.grounded ? -sw : -0.25;
    this.arms[0]!.rotation.z = -sw * 0.8 + (b.grounded ? 0 : 0.9);
    this.rig.position.y = b.grounded ? Math.abs(Math.sin(this.walk)) * 0.04 * Math.min(1, speed / 4) : 0;
    // Front arm: verbs.
    const v = sim.verb;
    let armZ = sw * 0.8;
    this.blade.visible = !!v && v.kind === "blade";
    this.shield.visible = sim.blocking;
    if (v && v.kind === "blade") {
      const p = Math.min(1, v.t / 0.14);
      const up = sim.prev?.up;
      armZ = up ? -2.6 + p * 2.2 : (v.chain % 2 ? 2.2 - p * 3.6 : -1.6 + p * 3.4);
    } else if (sim.blocking) armZ = 1.5;
    else if (v && (v.kind === "lantern" || v.kind === "hook")) armZ = 2.3;
    else if (b.rope) armZ = 2.8;
    this.arms[1]!.rotation.z = armZ;
    // Scarf flutter (follow-through).
    this.scarfTail.rotation.z = Math.sin(time * 9) * 0.15 - Math.min(0.6, speed * 0.06) + (b.grounded ? 0 : b.vy * 0.03);
    this.head.rotation.z = sim.hold ? -0.35 : Math.sin(time * 1.6) * 0.03;
    // Kneel while burying.
    if (sim.hold || sim.standT > 0) {
      this.legs[0]!.rotation.z = 1.2;
      this.legs[1]!.rotation.z = -0.4;
      this.rig.position.y = -0.18;
      this.arms[1]!.rotation.z = -0.6;
    }
    // Creases and damp on the body (the HUD never shows them).
    const lost = 5 - sim.creases;
    this.creaseLines.forEach((m, i) => (m.visible = i < lost));
    const damp = sim.damp;
    this.letter.color.copy(C("#f3ece0")).lerp(C("#a9a397"), damp * 0.7);
    this.rig.scale.y *= 1 - damp * 0.06;
    // Hurt flicker between flat and crumpled cuts.
    this.flicker = sim.invuln > 0 && sim.phase !== "hearth" ? this.flicker + dt : 0;
    this.root.visible = !(sim.invuln > 0.25 && Math.floor(this.flicker * 16) % 2 === 1);
    // Torn: hidden (the effects layer tears it apart).
    if (sim.phase === "torn") this.root.visible = false;
    // A carried lantern glows faintly.
    const lantern = sim.pack.slots.find((s) => s?.id === "ks.lantern");
    this.lanternLight.intensity = lantern ? Math.PI * (0.6 + lantern.tier * 0.3 + (v?.kind === "lantern" ? 6 : 0)) : 0;
  }
}
