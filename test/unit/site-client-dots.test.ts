// @vitest-environment happy-dom
// The page-wide dot field (site/client/dots.ts): a lattice of dots on a fixed canvas behind the
// page, drifting slowly on the home page and still on reading pages, a soft ring where the visitor
// clicks, parallax with the scroll, and nothing that moves under reduced motion or while paused.
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  type Dot,
  type Env,
  install,
  setProperty,
  showPage,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(o: { reduce?: boolean; canvas?: boolean; lang?: "en" | "ar" } = {}) {
  env = install(o);
  showPage("home", o.lang ?? "en");
  const motion = await import("../../site/client/motion.js");
  const { DotField } = await import("../../site/client/dots.js");
  return { DotField, motion };
}

afterEach(cleanup);

const INK = "rgba(18, 25, 22, ";
const RING = "rgba(35, 115, 92, ";
const picture = (): Dot[] => env.contexts[0]?.dots ?? [];
const ringDots = (): Dot[] => picture().filter((d) => d.fill.startsWith(RING));
const shades = (): string[] => [...new Set(picture().map((d) => d.fill))].sort();
const canvas = (): HTMLCanvasElement => {
  const c = document.querySelector("canvas.dotbg");
  if (!(c instanceof HTMLCanvasElement)) throw new Error("no dot field");
  return c;
};
const click = (x: number, y: number): void => {
  window.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y }));
};
const scrollTo = (y: number): void => {
  setProperty(window, "scrollY", y);
  window.dispatchEvent(new Event("scroll"));
};

describe("site: the dot field", () => {
  it("puts one canvas behind the page, hidden from screen readers, the size of the window", async () => {
    const { DotField } = await load();
    new DotField();
    expect(document.body.firstElementChild).toBe(canvas());
    expect(canvas().getAttribute("aria-hidden")).toBe("true");
    expect([canvas().width, canvas().height]).toEqual([1024, 768]);
    expect(env.contexts[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("draws sharp dots on a high-density screen, up to twice the pixels", async () => {
    const { DotField } = await load();
    setProperty(window, "devicePixelRatio", 3);
    new DotField();
    expect([canvas().width, canvas().height]).toEqual([2048, 1536]);
    expect(env.contexts[0]?.transform).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it("draws a pixel per point when the browser gives no pixel ratio", async () => {
    const { DotField } = await load();
    setProperty(window, "devicePixelRatio", 0);
    new DotField();
    expect([canvas().width, canvas().height]).toEqual([1024, 768]);
    expect(env.contexts[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("keeps still on a reading page: one even lattice, then no more frames", async () => {
    const { DotField } = await load();
    new DotField({ drift: false });
    env.frames.tick();
    // 47 columns (11 … 1023) and 36 rows (11 … 781), every 22 px, in one shade of ink.
    expect(picture()).toHaveLength(47 * 36);
    expect(picture()[0]).toEqual({ x: 11, y: 11, r: 1.1, fill: `${INK}0.115)` });
    expect(picture().at(-1)).toMatchObject({ x: 1023, y: 781 });
    expect(env.frames.pending).toBe(0);
  });

  it("drifts slowly on the home page, as a wave of four shades", async () => {
    const { DotField } = await load();
    new DotField();
    env.frames.tick();
    const first = picture().map((d) => [d.x, d.y]);
    expect(shades()).toEqual([`${INK}0.065)`, `${INK}0.09)`, `${INK}0.115)`, `${INK}0.14)`]);
    env.frames.run(2000);
    expect(env.frames.pending).toBe(1);
    const later = picture().map((d) => [d.x, d.y]);
    expect(later).toHaveLength(first.length);
    expect(later).not.toEqual(first);
    // a dot only sways around its place in the lattice (11 + 22k), by at most 1.1 px each way
    for (const [x = 0, y = 0] of later) {
      expect(Math.abs(x - 11 - Math.round((x - 11) / 22) * 22)).toBeLessThanOrEqual(1.1);
      expect(Math.abs(y - 11 - Math.round((y - 11) / 22) * 22)).toBeLessThanOrEqual(1.1);
    }
  });

  it("rings softly where the visitor clicks, and the ring fades out", async () => {
    const { DotField } = await load();
    new DotField({ drift: false });
    env.frames.tick();
    click(200, 300);
    expect(env.frames.pending).toBe(1);
    env.frames.run(192);
    const ring = ringDots();
    expect(ring.length).toBeGreaterThan(10);
    // 144 ms in: a band about 20 px wide, 68 px out, its dots a little bigger and brighter
    for (const d of ring) {
      expect(Math.abs(Math.hypot(d.x - 200, d.y - 300) - 68)).toBeLessThan(18);
      expect(d.r).toBeGreaterThan(1.1);
    }
    env.frames.run(640);
    expect(ringDots()).toEqual([]);
    expect(env.frames.pending).toBe(0);
  });

  it("keeps a ring where it was clicked on the page while the page scrolls", async () => {
    const { DotField } = await load();
    new DotField({ drift: false });
    click(200, 300);
    env.frames.run(128);
    scrollTo(100);
    env.frames.run(64);
    const ring = ringDots();
    expect(ring.length).toBeGreaterThan(10);
    const cy = ring.reduce((a, d) => a + d.y, 0) / ring.length;
    expect(Math.abs(cy - 200)).toBeLessThan(12);
  });

  it("moves the lattice a little slower than the page (parallax), and tells the intro where", async () => {
    const { DotField } = await load();
    const field = new DotField({ drift: false });
    expect(field.lattice()).toEqual({ sp: 22, ox: 11, oy: 11 });
    env.frames.tick();
    scrollTo(100);
    // 30 px of parallax: the rows sit 8 px higher (30 mod 22)
    expect(field.lattice()).toEqual({ sp: 22, ox: 11, oy: 3 });
    env.frames.tick();
    expect(picture()[0]).toMatchObject({ x: 11, y: 3 });
    expect(env.frames.pending).toBe(0);
  });

  it("redraws at the new size when the window is resized", async () => {
    const { DotField } = await load();
    new DotField({ drift: false });
    env.frames.tick();
    setProperty(window, "innerWidth", 390);
    setProperty(window, "innerHeight", 800);
    window.dispatchEvent(new Event("resize"));
    expect([canvas().width, canvas().height]).toEqual([390, 800]);
    env.frames.tick();
    expect(picture()).toHaveLength(18 * 37);
  });

  it("stops moving while paused: no drift, no new rings, rings stand still", async () => {
    const { DotField, motion } = await load();
    new DotField();
    click(500, 400);
    env.frames.run(128);
    motion.setPaused(true);
    env.frames.tick();
    const still = picture();
    expect(ringDots().length).toBeGreaterThan(0);
    env.frames.run(2000);
    expect(picture()).toEqual(still);
    click(100, 100);
    env.frames.run(256);
    expect(picture()).toEqual(still);
    // Played again, the ring goes on, then fades, and the drift goes on.
    motion.setPaused(false);
    env.frames.run(1000);
    expect(ringDots()).toEqual([]);
    expect(env.frames.pending).toBe(1);
  });

  it("draws once and then waits while paused, even with a ring on the page", async () => {
    const { DotField, motion } = await load();
    new DotField({ drift: false });
    click(200, 300);
    env.frames.run(128);
    motion.setPaused(true);
    env.frames.tick();
    const ring = ringDots();
    expect(ring.length).toBeGreaterThan(0);
    // no frame after the paused picture (no busy loop while the visitor asked for stillness)
    expect(env.frames.pending).toBe(0);
    // a scroll still moves the lattice, the ring where it was
    scrollTo(10);
    env.frames.tick();
    expect(env.frames.pending).toBe(0);
    expect(ringDots().length).toBe(ring.length);
    // played again, the ring goes on and fades
    motion.setPaused(false);
    expect(env.frames.pending).toBe(1);
    env.frames.run(1000);
    expect(ringDots()).toEqual([]);
    expect(env.frames.pending).toBe(0);
  });

  it("leaves no ring behind the click on Pause animations", async () => {
    const { DotField, motion } = await load();
    new DotField();
    env.frames.tick();
    // the pointer goes down on the button, then its click pauses everything
    click(200, 300);
    motion.setPaused(true);
    env.frames.tick();
    expect(ringDots()).toEqual([]);
    motion.setPaused(false);
    env.frames.run(192);
    expect(ringDots().length).toBeGreaterThan(0);
  });

  it("stops drifting in a hidden tab, and draws again when it is shown", async () => {
    const { DotField } = await load();
    new DotField();
    env.frames.tick();
    setProperty(document, "hidden", true);
    env.frames.tick();
    expect(env.frames.pending).toBe(0);
    setProperty(document, "hidden", false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(env.frames.pending).toBe(1);
    env.frames.tick();
    expect(env.frames.pending).toBe(1);
  });

  it("holds a still lattice under reduced motion: no drift, no parallax, no rings", async () => {
    const { DotField } = await load({ reduce: true });
    const field = new DotField();
    env.frames.tick();
    expect(shades()).toEqual([`${INK}0.115)`]);
    expect(env.frames.pending).toBe(0);
    click(200, 300);
    scrollTo(100);
    expect(field.lattice()).toEqual({ sp: 22, ox: 11, oy: 11 });
    env.frames.run(200);
    expect(ringDots()).toEqual([]);
    expect(picture()[0]).toMatchObject({ x: 11, y: 11 });
  });

  it("does without a canvas context", async () => {
    const { DotField } = await load({ canvas: false });
    new DotField();
    click(200, 300);
    env.frames.run(1000);
    expect(env.contexts).toEqual([]);
    expect(env.frames.pending).toBe(1);
  });
});
