// The page-wide dot field on a fixed canvas behind everything: a very slow drift (the home page;
// the pages made for reading keep still), and a soft small ring around the pointer on a click. Both
// stop under reduced motion and when animations are paused; the logo intro borrows its dots
// (lattice()).
import { el, tokenRgb } from "./dom.js";
import { ease, isPaused, onPausedChange, reduceMotion } from "./motion.js";

const SPACING = 22;
const PARALLAX = 0.3;
/** Four shades of the dots, so the drift reads as a slow wave of light. */
const ALPHA = [0.065, 0.09, 0.115, 0.14];

interface Ring {
  x: number;
  /** Page y (the ring stays where it was clicked while the page scrolls). */
  y: number;
  age: number;
  dur: number;
  max: number;
  band: number;
  strength: number;
}

export interface Lattice {
  sp: number;
  ox: number;
  oy: number;
}

export class DotField {
  private readonly canvas = el("canvas", "dotbg");
  private readonly ctx: CanvasRenderingContext2D | null;
  private w = 0;
  private h = 0;
  private rings: Ring[] = [];
  private raf: number | null = null;
  private last: number | null = null;
  private clock = 0;
  private readonly ink = tokenRgb("--tj-ink");
  private readonly ringInk = tokenRgb("--tj-g600");

  constructor(private readonly opts: { drift: boolean } = { drift: true }) {
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    window.addEventListener("resize", () => this.size());
    window.addEventListener("scroll", () => this.kick(), { passive: true });
    document.addEventListener("visibilitychange", () => this.kick());
    onPausedChange(() => this.kick());
    if (!reduceMotion) {
      window.addEventListener(
        "pointerdown",
        (e) => {
          if (isPaused()) return;
          this.rings.push({
            x: e.clientX,
            y: e.clientY + window.scrollY,
            age: 0,
            dur: 760,
            max: 120,
            band: 16,
            strength: 0.5,
          });
          this.kick();
        },
        { passive: true },
      );
    }
    this.size();
  }

  /** Where the background dots are right now (viewport coordinates). */
  lattice(): Lattice {
    return { sp: SPACING, ox: SPACING / 2, oy: this.offsetY() + SPACING / 2 };
  }

  private offsetY(): number {
    return reduceMotion ? 0 : -((window.scrollY * PARALLAX) % SPACING);
  }

  private drifting(): boolean {
    return this.opts.drift && !reduceMotion && !isPaused() && !document.hidden;
  }

  private size(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.kick();
  }

  private kick(): void {
    if (this.raf !== null) return;
    this.last = null;
    this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    const dt = this.last === null ? 16 : Math.min(64, now - this.last);
    this.last = now;
    const moving = this.drifting();
    if (!isPaused()) {
      for (const r of this.rings) r.age += dt;
      if (moving) this.clock += dt;
    }
    this.rings = this.rings.filter((r) => r.age < r.dur);
    this.draw();
    // Paused, a ring stands still: one picture, then no frames until play (onPausedChange).
    if (moving || (this.rings.length > 0 && !isPaused())) {
      this.raf = requestAnimationFrame((t) => this.frame(t));
    } else {
      this.raf = null;
      this.last = null;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    const { w, h, clock } = this;
    ctx.clearRect(0, 0, w, h);
    const sy = reduceMotion ? 0 : window.scrollY * PARALLAX;
    const oy = this.offsetY();
    const drift = this.opts.drift && !reduceMotion;
    const hot: number[] = [];
    const buckets: number[][] = [[], [], [], []];
    for (let y = oy + SPACING / 2; y < h + SPACING; y += SPACING) {
      for (let x = SPACING / 2; x < w; x += SPACING) {
        let px = x;
        let py = y;
        let b = 2;
        if (drift) {
          const ph = x * 0.011 + (y + sy) * 0.007 + clock * 0.00042;
          px += Math.sin(ph) * 1.1;
          py += Math.cos(ph * 0.85) * 1.1;
          const wave = Math.sin(x * 0.005 - (y + sy) * 0.0035 + clock * 0.00032);
          b = Math.min(3, Math.floor(((wave + 1) / 2) * 4));
        }
        let k = 0;
        for (const r of this.rings) {
          const p = r.age / r.dur;
          if (p <= 0 || p >= 1) continue;
          const radius = ease.out(p) * r.max;
          const band = r.band + 20 * p;
          const d = Math.hypot(px - r.x, py - (r.y - window.scrollY));
          const v = Math.max(0, 1 - Math.abs(d - radius) / band) * (1 - p) * r.strength;
          if (v > k) k = v;
        }
        if (k > 0.05) hot.push(px, py, k);
        else buckets[b]?.push(px, py);
      }
    }
    buckets.forEach((bucket, i) => {
      ctx.fillStyle = `rgba(${this.ink}, ${ALPHA[i]})`;
      ctx.beginPath();
      for (let q = 0; q < bucket.length; q += 2) {
        const x = bucket[q] ?? 0;
        const y = bucket[q + 1] ?? 0;
        ctx.moveTo(x + 1.1, y);
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      }
      ctx.fill();
    });
    for (let i = 0; i < hot.length; i += 3) {
      const v = Math.min(1, hot[i + 2] ?? 0);
      ctx.fillStyle = `rgba(${this.ringInk}, ${(0.16 + 0.6 * v).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(hot[i] ?? 0, hot[i + 1] ?? 0, 1.1 + 1.2 * v, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
