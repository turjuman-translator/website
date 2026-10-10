// @vitest-environment happy-dom
// The website's one animation clock and its pause switch (site/client/motion.ts): reduced motion
// read once, the paused state on <html>, one frame loop for every ticker, visibility, easing, word
// spans and the FLIP glide.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  type Env,
  FakeIntersectionObserver,
  install,
  intersect,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(o: { reduce?: boolean } = {}) {
  env = install(o);
  return import("../../site/client/motion.js");
}

afterEach(cleanup);

describe("site: motion", () => {
  it("reads the visitor's reduced-motion wish once", async () => {
    expect((await load()).reduceMotion).toBe(false);
    cleanup();
    expect((await load({ reduce: true })).reduceMotion).toBe(true);
  });

  it("pauses everything with one switch: the class on <html> and every listener, once per change", async () => {
    const m = await load();
    const heard: boolean[] = [];
    m.onPausedChange((p) => heard.push(p));
    expect(m.isPaused()).toBe(false);
    m.setPaused(true);
    m.setPaused(true);
    expect(m.isPaused()).toBe(true);
    expect(document.documentElement.classList.contains("motion-paused")).toBe(true);
    m.setPaused(false);
    expect(document.documentElement.classList.contains("motion-paused")).toBe(false);
    expect(heard).toEqual([true, false]);
  });

  it("drives every ticker from one frame loop, with the time since the last frame (at most 64 ms)", async () => {
    const m = await load();
    const a: number[] = [];
    const b: number[] = [];
    m.addTicker((dt) => a.push(dt));
    m.addTicker((dt) => b.push(dt));
    expect(env.frames.pending).toBe(1);
    env.frames.tick(16);
    env.frames.tick(20);
    env.frames.tick(500);
    expect(a).toEqual([0, 20, 64]);
    expect(b).toEqual(a);
    expect(env.frames.pending).toBe(1);
  });

  it("tells when an element comes into view or leaves it, with a margin", async () => {
    const m = await load();
    const node = document.createElement("div");
    const seen: boolean[] = [];
    m.watchVisible(node, (v) => seen.push(v));
    m.watchVisible(node, () => {}, "0px");
    expect(FakeIntersectionObserver.all.map((io) => io.rootMargin)).toEqual(["80px", "0px"]);
    intersect(node, false);
    intersect(node, true);
    expect(seen).toEqual([false, true]);
  });

  it("counts everything as visible in a browser without IntersectionObserver", async () => {
    const m = await load();
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
    expect("IntersectionObserver" in window).toBe(false);
    const seen: boolean[] = [];
    m.watchVisible(document.body, (v) => seen.push(v));
    expect(seen).toEqual([true]);
  });

  it("eases and clamps", async () => {
    const { ease, clamp01, seg } = await load();
    expect([ease.out(0), ease.out(1), ease.out(0.5)]).toEqual([0, 1, 1 - 0.5 ** 4]);
    expect([ease.inOut(0), ease.inOut(0.5), ease.inOut(1)]).toEqual([0, 0.5, 1]);
    expect(ease.inOut(0.25) + ease.inOut(0.75)).toBeCloseTo(1);
    expect([clamp01(-1), clamp01(0.3), clamp01(2)]).toEqual([0, 0.3, 1]);
    expect([seg(50, 100, 200), seg(150, 100, 200), seg(250, 100, 200)]).toEqual([0, 0.5, 1]);
  });

  it("splits text into word spans with a space between them", async () => {
    const { splitWords } = await load();
    const p = document.createElement("p");
    const spans = splitWords(p, "  The Friday  khutbah ", "w");
    expect(spans.map((s) => s.textContent)).toEqual(["The", "Friday", "khutbah"]);
    expect(p.innerHTML).toBe(
      '<span class="w">The</span> <span class="w">Friday</span> <span class="w">khutbah</span>',
    );
  });

  it("glides the rows that moved from where they were, and leaves the rest", async () => {
    const { glide } = await load();
    const box = document.createElement("div");
    box.innerHTML = '<p id="a">a</p><p id="b">b</p><p id="c">c</p>';
    document.body.append(box);
    const [a, b, c] = [...box.children];
    glide(
      box,
      () => {
        a?.remove();
        box.append(document.createElement("p"));
      },
      640,
    );
    // b and c moved up a row (40 px); a is gone and the new row was not there before.
    expect(env.animate.mock.contexts).toEqual([b, c]);
    expect(env.animate.mock.calls[0]).toEqual([
      [{ transform: "translateY(40px)" }, { transform: "none" }],
      { duration: 640, easing: "cubic-bezier(.22,1,.36,1)" },
    ]);
    // Nothing moves: nothing animates.
    env.animate.mockClear();
    glide(box, () => b?.classList.add("past"), 640);
    expect(env.animate).not.toHaveBeenCalled();
    expect(c?.isConnected).toBe(true);
  });

  it("only rearranges, without a glide, under reduced motion", async () => {
    const { glide } = await load({ reduce: true });
    const box = document.createElement("div");
    box.innerHTML = "<p>a</p><p>b</p>";
    const mutate = vi.fn(() => box.firstElementChild?.remove());
    glide(box, mutate, 640);
    expect(mutate).toHaveBeenCalledOnce();
    expect(box.children).toHaveLength(1);
    expect(env.animate).not.toHaveBeenCalled();
  });
});
