// @vitest-environment happy-dom
// The logo intro over the board (site/client/intro.ts): the background dots gather into the arch,
// the mark draws itself, then glides to its place in the board's header and hands over.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lattice } from "../../site/client/dots.js";
import {
  ARCH,
  cleanup,
  type Env,
  install,
  LINE,
  place,
  setProperty,
  showPage,
  svgGeometry,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(o: { reduce?: boolean; canvas?: boolean } = {}) {
  env = install(o);
  showPage("home");
  svgGeometry();
  vi.spyOn(Math, "random").mockReturnValue(0);
  setProperty(document.documentElement, "clientWidth", 1024);
  place(board(), { left: 100, top: 200, width: 800, height: 400 });
  place(home(), { left: 487, top: 210, width: 26, height: 34 });
  // the big mark, where playIntro puts it: 200 px tall in the middle of the board
  env.measure = (el) =>
    el.getAttribute("class") === "intro-mark"
      ? { left: 500 - 200 * (24 / 63), top: 300, width: (200 * 48) / 63, height: 200 }
      : undefined;
  return import("../../site/client/intro.js");
}

const board = (): HTMLElement => document.querySelector<HTMLElement>("#board") ?? document.body;
const home = (): Element => document.querySelector("#home-mark svg") ?? document.body;
const lattice =
  (sp = 22): (() => Lattice) =>
  () => ({ sp, ox: 11, oy: 5 });
const mark = (): SVGSVGElement | null => document.querySelector("svg.intro-mark");
const dotsCanvas = (): HTMLCanvasElement | null => document.querySelector("canvas.intro-dots");
const px = (el: Element | null, prop: string): number =>
  Number.parseFloat((el as HTMLElement | null)?.style.getPropertyValue(prop) ?? "");
const dash = (cls: string): number =>
  Number.parseFloat(
    mark()?.querySelector<SVGPathElement>(`.${cls}`)?.style.getPropertyValue("stroke-dashoffset") ??
      "",
  );

afterEach(cleanup);

describe("site: the logo intro", () => {
  it("lands at once under reduced motion, drawing nothing", async () => {
    const { playIntro } = await load({ reduce: true });
    const onLanded = vi.fn();
    playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded });
    expect(onLanded).toHaveBeenCalledOnce();
    expect([mark(), dotsCanvas(), env.frames.pending]).toEqual([null, null, 0]);
  });

  it("draws the mark big in the middle of the board, over a canvas around it", async () => {
    const { playIntro } = await load();
    setProperty(window, "scrollY", 1000);
    place(board(), { left: 100, top: -800, width: 800, height: 400 });
    playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded: () => {} });
    const svg = mark();
    expect(svg?.getAttribute("viewBox")).toBe("8 1 48 63");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect([...(svg?.children ?? [])].map((p) => p.getAttribute("class"))).toEqual([
      "b-arch",
      "b-l1",
      "b-l2",
    ]);
    // at most half the board's height (200 px), 48:63, centred, in page coordinates
    expect(px(svg, "height")).toBe(200);
    expect(px(svg, "width")).toBeCloseTo(152.38, 2);
    expect(px(svg, "left")).toBeCloseTo(423.81, 2);
    expect(px(svg, "top")).toBe(300);
    // the board and 60 px around it, never past the window's sides
    const c = dotsCanvas();
    expect(c?.getAttribute("aria-hidden")).toBe("true");
    expect([px(c, "left"), px(c, "top"), px(c, "width"), px(c, "height")]).toEqual([
      40, 140, 920, 520,
    ]);
    expect([c?.width, c?.height]).toEqual([920, 520]);
    // nothing of the mark is drawn yet
    expect([dash("b-arch"), dash("b-l1"), dash("b-l2")]).toEqual([ARCH, LINE, LINE]);
  });

  it("gathers the dots around the board into the arch, then fades them as the mark is drawn", async () => {
    const { playIntro } = await load();
    playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded: () => {} });
    const ctx = env.contexts[0];
    env.frames.tick();
    // 104 dots, each from a place of the background lattice (x 11 + 22k, y 5 + 22k)
    expect(ctx?.dots).toHaveLength(104);
    for (const d of ctx?.dots ?? []) {
      expect((d.x + 40 - 11) % 22).toBe(0);
      expect((d.y + 140 - 5) % 22).toBe(0);
      expect(d.fill).toBe("rgba(12, 63, 49, 0.120)");
    }
    // 1.25 s in: every dot on its point of the arch, in full pine
    env.frames.run(1248, 48);
    const scale = 200 / 63;
    const targets = Array.from({ length: 104 }, (_, i) => {
      const l = (ARCH * i) / 104;
      const x = 12 + (40 * l) / ARCH;
      const y = 46 - 40 * Math.sin((Math.PI * l) / ARCH);
      return [423.81 + (x - 8) * scale - 40, 300 + (y - 1) * scale - 140];
    });
    for (const [k, d] of (ctx?.dots ?? []).entries()) {
      expect(d.x).toBeCloseTo(targets[k]?.[0] ?? 0, 1);
      expect(d.y).toBeCloseTo(targets[k]?.[1] ?? 0, 1);
      expect(d.fill).toBe("rgba(12, 63, 49, 0.900)");
    }
    expect(dash("b-arch")).toBeLessThan(ARCH);
    expect(dash("b-l1")).toBe(LINE);
    // the arch draws itself, then the two lines, as the dots fade
    env.frames.run(624, 48);
    expect(ctx?.dots).toEqual([]);
    expect(dash("b-arch")).toBe(0);
    expect(dash("b-l1")).toBeGreaterThan(0);
    env.frames.run(480, 48);
    expect([dash("b-l1"), dash("b-l2")]).toEqual([0, 0]);
  });

  it("glides the mark to its place in the header, then hands over", async () => {
    const { playIntro } = await load();
    const onLanded = vi.fn();
    playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded });
    env.frames.tick();
    env.frames.run(2544, 48);
    expect(env.animate).not.toHaveBeenCalled();
    env.frames.tick(48);
    expect(env.animate).toHaveBeenCalledOnce();
    expect(env.animate.mock.contexts[0]).toBe(mark());
    const [frames, timing] = env.animate.mock.calls[0] ?? [];
    expect(frames).toEqual([
      { transform: "translate(0, 0) scale(1)" },
      // from the big mark (left 423.8, top 300, 200 px tall) to the small one (487, 210, 34 px)
      { transform: `translate(${487 - (500 - (200 * 24) / 63)}px, -90px) scale(0.17)` },
    ]);
    expect(timing).toEqual({
      duration: 950,
      easing: "cubic-bezier(.65,0,.35,1)",
      fill: "forwards",
    });
    // no more frames while it flies; when it lands, the intro is gone
    expect(env.frames.pending).toBe(0);
    expect(onLanded).not.toHaveBeenCalled();
    const flight = env.animate.mock.results[0]?.value as Animation;
    flight.onfinish?.call(flight, new Event("finish") as AnimationPlaybackEvent);
    expect(onLanded).toHaveBeenCalledOnce();
    expect([mark(), dotsCanvas()]).toEqual([null, null]);
  });

  it("draws its dots sharp on a high-density screen, twice the pixels at most", async () => {
    const screens: Array<[ratio: number, scale: number]> = [
      [3, 2],
      [1.5, 1.5],
      [0, 1],
    ];
    for (const [ratio, scale] of screens) {
      const { playIntro } = await load();
      setProperty(window, "devicePixelRatio", ratio);
      playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded: () => {} });
      expect([dotsCanvas()?.width, dotsCanvas()?.height]).toEqual([920 * scale, 520 * scale]);
      expect(env.contexts[0]?.transform).toEqual([scale, 0, 0, scale, 0, 0]);
      cleanup();
    }
  });

  it("gathers what dots there are on a sparse lattice", async () => {
    const { playIntro } = await load();
    playIntro({
      lattice: lattice(200),
      area: board(),
      home: home(),
      size: 230,
      onLanded: () => {},
    });
    env.frames.tick();
    // columns 211, 411, 611, 811 (x 40 … 960) and rows 205, 405, 605 (y 140 … 660)
    expect(env.contexts[0]?.dots).toHaveLength(12);
  });

  it("still draws and lands the mark without a canvas context", async () => {
    const { playIntro } = await load({ canvas: false });
    const onLanded = vi.fn();
    playIntro({ lattice: lattice(), area: board(), home: home(), size: 230, onLanded });
    env.frames.tick();
    env.frames.run(2600, 48);
    expect(dash("b-arch")).toBe(0);
    const flight = env.animate.mock.results[0]?.value as Animation;
    flight.onfinish?.call(flight, new Event("finish") as AnimationPlaybackEvent);
    expect(onLanded).toHaveBeenCalledOnce();
  });
});
