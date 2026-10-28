// PaperBody: Folio's movement on the tile grid (GDD §9, tuning §1). Fixed step, slopes, one-way ledges,
// coyote and buffer, jump cut and apex float (Preserve's protected-feel discipline), plus the paper forms:
// dart (glide), flat (dodge slide), ball (crumple roll down slopes) and a hook rope.
import { TUNE as T } from "../data/tuning.ts";
import { EMPTY, LOWCEIL, ONEWAY, SLOPE_DOWN, SLOPE_UP, SOLID, type World } from "./world.ts";

export type Form = "stand" | "flat" | "ball" | "dart";

export interface MoveInput {
  x: number; // -1..1
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  slidePressed: boolean;
}

export interface Rope { x: number; y: number; len: number }

const EPS = 1e-4;

export class PaperBody {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = false;
  /** -1 ground falls to the right ('\'), +1 rises to the right ('/'), 0 flat. */
  slope: -1 | 0 | 1 = 0;
  onLedge = false;
  form: Form = "stand";
  coyote = 0;
  buffer = 0;
  jumping = false;
  cut = false;
  flatT = 0;
  flatAge = 0;
  flatCooldown = 0;
  dropT = 0;
  soaked = false;
  /** Movement scale applied by verbs (shield block slows Folio). */
  speedScale = 1;
  /** Verbs that hold Folio still (bury, dig) set this. */
  locked = false;
  rope: Rope | null = null;
  readonly events: Array<{ id: string; [k: string]: unknown }> = [];

  private readonly world: World;

  constructor(world: World, x: number, y: number) {
    this.world = world;
    this.x = x;
    this.y = y;
  }

  get w(): number {
    return this.form === "flat" ? T.flatWidth : this.form === "ball" ? 0.7 : T.width;
  }
  get h(): number {
    return this.form === "flat" ? T.flatHeight : this.form === "ball" ? 0.7 : T.height;
  }
  get cy(): number {
    return this.y + this.h / 2;
  }
  /** Flatten i-frames (GDD §10). */
  get dodging(): boolean {
    return this.form === "flat" && this.flatT > 0 && this.flatAge >= T.flattenIFrames[0] && this.flatAge <= T.flattenIFrames[1];
  }

  private emit(id: string, data: Record<string, unknown> = {}): void {
    this.events.push({ id, ...data });
  }

  /** Highest floor surface at x between yLow and yHigh. One-way surfaces count only from above. */
  surface(x: number, yHigh: number, yLow: number, prevFeet: number, sides: boolean): number | null {
    const w = this.world;
    let best: number | null = null;
    const consider = (s: number, oneway: boolean) => {
      if (s > yHigh + EPS || s < yLow - EPS) return;
      if (oneway && (this.dropT > 0 || s > prevFeet + 0.02)) return;
      if (best === null || s > best) best = s;
    };
    const xs = sides ? [x, x - this.w / 2 + 0.02, x + this.w / 2 - 0.02] : [x];
    xs.forEach((sx, i) => {
      const cx = Math.floor(sx);
      for (let cy = Math.floor(yHigh); cy >= Math.floor(yLow) - 1; cy--) {
        const k = w.kind(cx, cy);
        if (k === EMPTY) continue;
        if (k === SOLID || k === LOWCEIL) consider(cy + 1, false);
        else if (k === ONEWAY) consider(cy + 1, true);
        else if (i === 0 && k === SLOPE_UP) consider(cy + (sx - cx), false);
        else if (i === 0 && k === SLOPE_DOWN) consider(cy + 1 - (sx - cx), false);
      }
      for (const l of w.ledges) if (sx >= l.x0 && sx <= l.x1) consider(l.y, true);
    });
    return best;
  }

  private slopeUnder(): -1 | 0 | 1 {
    const cx = Math.floor(this.x);
    for (const cy of [Math.floor(this.y - EPS), Math.floor(this.y + EPS)]) {
      const k = this.world.kind(cx, cy);
      if (k === SLOPE_UP) return 1;
      if (k === SLOPE_DOWN) return -1;
    }
    return 0;
  }

  /** Solid boxes (walls and ceilings) overlapping a box. Slopes and one-ways are floors only. */
  private blockers(x0: number, y0: number, x1: number, y1: number, cb: (bx0: number, by0: number, bx1: number, by1: number) => void): void {
    for (let cy = Math.floor(y0); cy <= Math.floor(y1 - EPS); cy++)
      for (let cx = Math.floor(x0); cx <= Math.floor(x1 - EPS); cx++) {
        const k = this.world.kind(cx, cy);
        if (k === SOLID) cb(cx, cy, cx + 1, cy + 1);
        else if (k === LOWCEIL) cb(cx, cy + 0.5, cx + 1, cy + 1);
      }
  }

  fits(form: Form): boolean {
    const keep = this.form;
    this.form = form;
    const w = this.w, h = this.h;
    this.form = keep;
    let ok = true;
    this.blockers(this.x - w / 2 + 0.01, this.y + 0.02, this.x + w / 2 - 0.01, this.y + h, (_a, by0, _c, by1) => {
      if (by1 > this.y + 0.36 && by0 < this.y + h) ok = false;
    });
    return ok;
  }

  private setForm(f: Form): void {
    if (this.form === f) return;
    const from = this.form;
    this.form = f;
    if (f === "flat") this.emit("move.flatten");
    else if (f === "ball") this.emit("move.crumple");
    else if (f === "dart") this.emit("move.dart");
    else if (from === "ball" || from === "flat") this.emit("move.unfold");
  }

  step(dt: number, inp: MoveInput): void {
    const wasGrounded = this.grounded;
    const prevFeet = this.y;
    this.coyote = this.grounded ? T.coyote : Math.max(0, this.coyote - dt);
    this.buffer = inp.jumpPressed ? T.buffer : Math.max(0, this.buffer - dt);
    this.flatCooldown = Math.max(0, this.flatCooldown - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    const ix = this.locked ? 0 : inp.x;
    if (ix > 0.2) this.facing = 1;
    else if (ix < -0.2) this.facing = -1;

    // Forms ---------------------------------------------------------------
    if (!this.locked && inp.slidePressed && this.form !== "flat") {
      if (this.form === "ball") this.setForm(this.fits("stand") ? "stand" : "flat");
      else if (this.grounded && this.flatCooldown <= 0) {
        if (this.slope !== 0) {
          this.setForm("ball");
          this.rope = null;
        } else {
          this.setForm("flat");
          this.flatT = T.flattenTime;
          this.flatAge = 0;
          this.vx = this.facing * T.flattenSpeed;
        }
      }
    }
    if (this.form === "flat") {
      this.flatAge += dt;
      if (this.flatT > 0) {
        this.flatT -= dt;
        this.vx = this.facing * T.flattenSpeed * (1 - 0.5 * (this.flatAge / T.flattenTime));
        if (this.flatT <= 0) this.flatCooldown = T.flattenCooldown;
      } else {
        // Stuck under a low ceiling: crawl until there's room to stand.
        this.vx = ix * T.crawlSpeed;
        if (this.fits("stand")) this.setForm("stand");
      }
      if (!this.grounded && this.flatT <= 0 && this.fits("stand")) this.setForm("stand");
    }

    // Jump ------------------------------------------------------------------
    const canJump = this.form !== "ball" && !this.locked;
    if (canJump && this.buffer > 0 && (this.grounded || this.coyote > 0)) {
      if (inp.down && this.onLedge) {
        this.dropT = 0.25;
        this.buffer = 0;
      } else if (this.form !== "flat" || this.fits("stand")) {
        if (this.form === "flat") this.setForm("stand");
        this.vy = this.soaked ? T.dampJump : T.jump;
        this.grounded = false;
        this.coyote = 0;
        this.buffer = 0;
        this.jumping = true;
        this.cut = false;
        this.emit("move.jump");
      }
    }
    if (this.rope && inp.jumpPressed && !this.grounded) {
      this.rope = null;
      this.vy = Math.max(this.vy, 0) + 4;
      this.jumping = true;
      this.cut = false;
      this.emit("hook.release");
    }
    if (this.jumping && !inp.jump && this.vy > 0 && !this.cut) {
      this.vy *= T.jumpCut;
      this.cut = true;
    }
    if (this.vy <= 0) this.jumping = false;

    // Horizontal ---------------------------------------------------------------
    if (this.form === "ball") {
      const downhill = -this.slope;
      if (this.grounded && downhill !== 0) this.vx += (downhill * T.crumpleAccel + ix * 8) * dt;
      else if (this.grounded) {
        const s = Math.sign(this.vx);
        this.vx -= s * 18 * dt;
        if (Math.sign(this.vx) !== s) this.vx = 0;
        this.vx += ix * 6 * dt;
        if (Math.abs(this.vx) < 2.5 && this.fits("stand")) this.setForm("stand");
      }
      this.vx = Math.max(-T.crumpleMax, Math.min(T.crumpleMax, this.vx));
    } else if (this.form !== "flat") {
      const top = (this.soaked ? T.dampRunSpeed : T.runSpeed) * this.speedScale;
      if (this.form === "dart") {
        const target = this.facing * T.dartForward;
        this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), T.airAccel * dt);
      } else {
        const target = ix * top;
        const accel = this.grounded ? (ix === 0 ? T.friction : T.groundAccel) : T.airAccel;
        if (this.rope && !this.grounded) this.vx += ix * 14 * dt;
        else if (Math.abs(target - this.vx) <= accel * dt) this.vx = target;
        else this.vx += Math.sign(target - this.vx) * accel * dt;
      }
    }
    this.moveX(this.vx * dt);

    // Vertical -----------------------------------------------------------------
    let g = T.gravity;
    if (inp.jump && Math.abs(this.vy) < T.apexBand && !this.grounded && this.form === "stand") g *= T.apexHang;
    if (!this.grounded) this.vy = Math.max(-T.terminal, this.vy - g * dt);
    if (this.form === "dart") this.vy = Math.max(this.vy, -T.dartFallCap);

    if (this.vy > 0) {
      const ny = this.y + this.vy * dt;
      let ceil = Infinity;
      this.blockers(this.x - this.w / 2 + 0.02, this.y + this.h - 0.05, this.x + this.w / 2 - 0.02, ny + this.h, (_a, by0) => {
        if (by0 >= this.y + this.h - 0.06) ceil = Math.min(ceil, by0);
      });
      if (ny + this.h > ceil) {
        this.y = ceil - this.h;
        this.vy = 0;
        this.emit("move.bonk");
      } else this.y = ny;
      this.grounded = false;
    } else {
      const ny = this.y + this.vy * dt;
      const snap = wasGrounded && !this.jumping && this.form !== "dart" ? 0.45 : 0;
      const stepUp = wasGrounded ? 0.36 : 0.02;
      const s = this.surface(this.x, this.y + stepUp, ny - snap, prevFeet, true);
      if (s !== null) {
        const fall = -this.vy;
        this.y = s;
        if (!wasGrounded) this.emit("move.land", { speed: fall });
        this.vy = 0;
        this.grounded = true;
      } else {
        this.y = ny;
        this.grounded = false;
      }
    }
    if (this.grounded) {
      this.slope = this.slopeUnder();
      this.onLedge = this.onOneway();
      if (this.form === "dart") this.setForm("stand");
    } else this.slope = 0;

    // Dart: hold jump while falling (not while soaked or roped).
    if (!this.grounded && this.form === "stand" && inp.jump && this.vy < 0 && !this.soaked && !this.rope && !this.jumping) this.setForm("dart");
    if (this.form === "dart" && (!inp.jump || this.soaked || this.grounded)) this.setForm("stand");

    // Rope constraint (hook swing) ------------------------------------------------
    if (this.rope) {
      const r = this.rope;
      if (inp.up) r.len = Math.max(1.2, r.len - 6 * dt);
      if (inp.down) r.len = Math.min(10, r.len + 6 * dt);
      const dx = this.x - r.x, dy = this.cy - r.y;
      const d = Math.hypot(dx, dy);
      if (d > r.len) {
        const nx = dx / d, ny = dy / d;
        const tx = r.x + nx * r.len, ty = r.y + ny * r.len - this.h / 2;
        const ox = this.x, oy = this.y;
        this.moveX(tx - this.x);
        // Only pull upward through open space; never pull through floors.
        if (ty > this.y) {
          let ceil = Infinity;
          this.blockers(this.x - this.w / 2 + 0.02, this.y + this.h - 0.05, this.x + this.w / 2 - 0.02, ty + this.h, (_a, by0) => {
            if (by0 >= this.y + this.h - 0.06) ceil = Math.min(ceil, by0);
          });
          this.y = Math.min(ty, ceil - this.h);
          if (this.y > oy + 1e-3) this.grounded = false;
        } else if (!this.grounded) {
          const s = this.surface(this.x, this.y + 0.02, ty, this.y, true);
          this.y = s ?? ty;
          if (s !== null) this.grounded = true;
        }
        void ox;
        const radial = this.vx * nx + this.vy * ny;
        if (radial > 0) {
          this.vx -= radial * nx;
          this.vy -= radial * ny;
        }
      }
    }
  }

  private onOneway(): boolean {
    const cx = Math.floor(this.x), cy = Math.round(this.y) - 1;
    if (Math.abs(this.y - Math.round(this.y)) < 0.01 && this.world.kind(cx, cy) === ONEWAY) return true;
    return this.world.ledges.some((l) => Math.abs(l.y - this.y) < 0.01 && this.x >= l.x0 && this.x <= l.x1);
  }

  /** Move horizontally, stopping at walls. Low steps (slope seams) are walked over. */
  moveX(dx: number): void {
    if (dx === 0) return;
    const nx = this.x + dx;
    const half = this.w / 2;
    const step = this.grounded ? 0.36 : 0.02;
    let stop: number | null = null;
    this.blockers(nx - half, this.y + 0.01, nx + half, this.y + this.h, (bx0, by0, bx1, by1) => {
      if (by1 - this.y <= step) return;
      if (by0 >= this.y + this.h) return;
      const edge = dx > 0 ? bx0 - half - EPS : bx1 + half + EPS;
      if (dx > 0 ? this.x + half <= bx0 + 0.01 : this.x - half >= bx1 - 0.01) stop = stop === null ? edge : dx > 0 ? Math.min(stop, edge) : Math.max(stop, edge);
    });
    if (stop !== null) {
      this.x = stop;
      if (this.form === "ball" && Math.abs(this.vx) > 6) this.emit("move.bump");
      this.vx = 0;
    } else this.x = nx;
  }
}
