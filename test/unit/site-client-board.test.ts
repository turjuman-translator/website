// @vitest-environment happy-dom
// The two-sided board under the hero and its scrubber (site/client/board.ts, scrubber.ts): the
// logo intro once the board is 60% in view, then a Friday from the Athan to the Salah; a still
// picture under reduced motion or paused animations; a scrubber to drag, click or key through,
// which stops on the final hold; and its play button, the page's "Pause animations" switch, which
// pauses and plays everything that moves and is remembered on this device, from the moment the
// page loads (until the board starts, the button is the page's alone: site/client/chrome.ts).
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION_KEY } from "../../site/client/storage-keys.js";
import type { SiteLang } from "../../site/content/khutbah.js";
import { DICTS } from "../../site/content/strings.js";
import {
  cleanup,
  type Env,
  FakeIntersectionObserver,
  install,
  intersect,
  place,
  setProperty,
  showPage,
  svgGeometry,
} from "./helpers/site-client-env.js";

let env: Env;

/** The scrubber's layout: a track at x 100…908, four 200 px chapter bars 2 px apart. */
const BAR = [100, 302, 504, 706];
/** The simulation's chapters (ms) as the board builds them: Athan, Khutbah, Iqama, Salah. The
 *  clock runs faster than the simulation: the Athan's 5 minutes take 25 s, the khutbah's 30
 *  minutes 26 s. */
// Where each chapter starts: where its card or first line starts (each cue begins 140 ms after
// the one before it).
const T = { athan: 140, khutbah: 25_280, iqama: 51_100, salah: 66_640, end: 81_394 };

async function load(o: { reduce?: boolean; lang?: SiteLang; observer?: boolean } = {}) {
  env = install(o);
  showPage("home", o.lang ?? "en");
  svgGeometry();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  setProperty(document.documentElement, "clientWidth", 1024);
  place($("#board"), { left: 100, top: 200, width: 800, height: 400 });
  place($("#home-mark svg"), { left: 487, top: 210, width: 26, height: 34 });
  place($(".yt-track"), { left: 100, top: 620, width: 808, height: 16 });
  for (const [k, bar] of [...document.querySelectorAll(".yt-bar")].entries()) {
    place(bar, { left: BAR[k] ?? 0, top: 624, width: 200, height: 8 });
  }
  if (o.observer === false) Reflect.deleteProperty(globalThis, "IntersectionObserver");
  const motion = await import("../../site/client/motion.js");
  const { motionButton } = await import("../../site/client/chrome.js");
  const { captionBoard } = await import("../../site/client/board.js");
  const lang = o.lang === "nl" ? "nl" : o.lang === "ar" ? "nl" : "en";
  // As the home page wires them: the button at load, the board when the fonts are ready.
  const takeButton = motionButton($(".yt-play"));
  captionBoard({
    board: $("#board"),
    scrubber: $("#scrubber"),
    lang,
    lattice: () => ({ sp: 22, ox: 11, oy: 11 }),
    takeButton,
  });
  return motion;
}

afterEach(cleanup);

function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`no ${selector}`);
  return node;
}
const d = DICTS.en;
const track = (): HTMLElement => $(".yt-track");
/** What the scrubber says. */
const scrubber = () => ({
  locked: $("#scrubber").classList.contains("locked"),
  tab: track().tabIndex,
  disabled: track().getAttribute("aria-disabled"),
  play: $<HTMLButtonElement>(".yt-play").disabled,
  label: $(".yt-play").getAttribute("aria-label"),
  time: $(".yt-time").textContent,
  chapter: $(".yt-chap").textContent,
});
const playing = (): boolean => !$(".yt-play").classList.contains("paused");
/** Whether everything on the page is paused, and what this device remembers. */
const page = () => ({
  paused: document.documentElement.classList.contains("motion-paused"),
  stored: localStorage.getItem(MOTION_KEY),
});
const card = (): string | undefined => $("#board").dataset.card;
const lines = (): string[] =>
  [...document.querySelectorAll("#board .caps .blk")].map((b) => b.className);
/** Runs the intro's frames until the mark flies to the header, and lands it. */
function landIntro(): void {
  for (let i = 0; i < 100 && env.animate.mock.calls.length === 0; i++) env.frames.tick(48);
  const flight = env.animate.mock.results[0]?.value as Animation;
  flight.onfinish?.call(flight, new Event("finish") as AnimationPlaybackEvent);
}
const pointer = (type: string, x: number, init: PointerEventInit = {}): void => {
  track().dispatchEvent(new PointerEvent(type, { clientX: x, button: 0, pointerId: 1, ...init }));
};
const key = (k: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const e = new KeyboardEvent("keydown", { key: k, cancelable: true, ...init });
  track().dispatchEvent(e);
  return e;
};

describe("site: the board", () => {
  it("waits under the hero, locked, until 60% of it is in view; its button already works", async () => {
    await load();
    expect($("#home-mark").classList.contains("away")).toBe(true);
    expect($("#board").classList.contains("intro")).toBe(true);
    expect(scrubber()).toEqual({
      locked: true,
      tab: -1,
      disabled: "true",
      play: false,
      label: d.motionPause,
      time: "12:45:00",
      chapter: d.m_athan,
    });
    // the button shows the page: moving
    expect(playing()).toBe(true);
    const [io] = FakeIntersectionObserver.all.filter((x) => x.thresholds[0] === 0.6);
    expect([...(io?.targets ?? [])]).toEqual([$("#board")]);
    // each chapter as long as its part of the simulation
    expect(
      [...document.querySelectorAll<HTMLElement>(".yt-ch")].map((s) =>
        s.style.getPropertyValue("flex-grow"),
      ),
    ).toEqual(
      [T.khutbah - T.athan, T.iqama - T.khutbah, T.salah - T.iqama, T.end - T.salah].map(String),
    );
    intersect($("#board"), false);
    expect(document.querySelector(".intro-mark")).toBeNull();
  });

  it("plays the logo intro, then the Friday from the Athan", async () => {
    await load();
    intersect($("#board"), true);
    expect(document.querySelector("svg.intro-mark")).not.toBeNull();
    // it plays once
    intersect($("#board"), true);
    expect(document.querySelectorAll("svg.intro-mark")).toHaveLength(1);
    landIntro();
    expect(document.querySelector(".intro-mark")).toBeNull();
    expect($("#home-mark").classList.contains("away")).toBe(false);
    expect(scrubber().locked).toBe(true);
    vi.advanceTimersByTime(450);
    expect($("#board").classList.contains("intro")).toBe(false);
    expect(scrubber()).toEqual({
      locked: false,
      tab: 0,
      disabled: "false",
      play: false,
      label: d.motionPause,
      time: "12:45:00",
      chapter: d.m_athan,
    });
    expect(playing()).toBe(true);
    env.frames.run(3200);
    expect(card()).toBe("athan");
    expect(document.querySelectorAll("#board .bcard.athan .bc-line").length).toBeGreaterThan(0);
    expect(scrubber().time).toBe("12:45:37");
  });

  it("starts at once on the still picture when the animations are paused, and plays when they play", async () => {
    const motion = await load();
    motion.setPaused(true);
    intersect($("#board"), true);
    expect(document.querySelector(".intro-mark")).toBeNull();
    // the verse, fully said, under the two lines before it
    expect(lines()).toEqual(["blk past", "blk past", "blk verse"]);
    expect(document.querySelector("#board .verse .tr")?.classList.contains("on")).toBe(true);
    expect(scrubber()).toMatchObject({
      locked: false,
      label: d.motionPlay,
      time: "13:07:49",
      chapter: d.m_khutbah,
    });
    env.frames.run(1000);
    expect(scrubber().time).toBe("13:07:49");
    motion.setPaused(false);
    expect(scrubber().label).toBe(d.motionPause);
    env.frames.run(3000);
    expect(scrubber().time).toBe("13:11:18");
  });

  it("shows the still picture under reduced motion, and plays only when asked", async () => {
    const motion = await load({ reduce: true });
    expect($("#home-mark").classList.contains("away")).toBe(false);
    expect(lines()).toEqual(["blk past", "blk past", "blk verse"]);
    expect(scrubber()).toMatchObject({ locked: false, label: d.motionPlay, time: "13:07:49" });
    motion.setPaused(true);
    motion.setPaused(false);
    expect(playing()).toBe(false);
    $(".yt-play").click();
    expect(playing()).toBe(true);
    expect(scrubber().label).toBe(d.motionPause);
  });

  it("starts at once in a browser without IntersectionObserver", async () => {
    await load({ observer: false });
    expect($("#home-mark").classList.contains("away")).toBe(false);
    expect(scrubber()).toMatchObject({ locked: false, label: d.motionPause, time: "12:45:00" });
    env.frames.run(2000);
    expect(scrubber().time).toBe("12:45:22");
  });

  it("pauses with the animations and plays on with them", async () => {
    const motion = await load({ observer: false });
    env.frames.run(1000);
    motion.setPaused(true);
    expect(scrubber().label).toBe(d.motionPlay);
    const at = scrubber().time;
    env.frames.run(5000);
    expect(scrubber().time).toBe(at);
    motion.setPaused(false);
    expect(scrubber().label).toBe(d.motionPause);
  });

  it("its play button pauses and plays everything that moves, and remembers it", async () => {
    const motion = await load({ observer: false });
    env.frames.run(1000);
    $(".yt-play").click();
    expect(scrubber().label).toBe(d.motionPlay);
    expect([page(), motion.isPaused()]).toEqual([{ paused: true, stored: "paused" }, true]);
    const at = scrubber().time;
    env.frames.run(5000);
    expect(scrubber().time).toBe(at);
    $(".yt-play").click();
    expect(scrubber().label).toBe(d.motionPause);
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
    env.frames.run(1000);
    expect(scrubber().time > at).toBe(true);
  });

  it("plays everything from the still picture of a page that was paused", async () => {
    const motion = await load();
    motion.setPaused(true);
    intersect($("#board"), true);
    expect(scrubber()).toMatchObject({ locked: false, label: d.motionPlay, time: "13:07:49" });
    $(".yt-play").click();
    expect(playing()).toBe(true);
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
    env.frames.run(1000);
    expect(scrubber().time > "13:07:49").toBe(true);
  });

  it("stops only the simulation with End: the rest of the page moves on", async () => {
    const motion = await load({ observer: false });
    key("End");
    expect(scrubber()).toMatchObject({ time: "13:30:00", label: d.motionPlay });
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: null }, false]);
    // and so does a drag that lets go on the final hold
    $(".yt-play").click();
    expect(playing()).toBe(true);
    pointer("pointerdown", 906);
    pointer("pointerup", 906);
    expect(scrubber()).toMatchObject({ time: "13:30:00", label: d.motionPlay });
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
  });

  it("keeps a paused page paused when the visitor seeks with a click, a drag or a key", async () => {
    const motion = await load({ observer: false });
    $(".yt-play").click();
    pointer("pointerdown", 402);
    pointer("pointerup", 402);
    expect(scrubber()).toMatchObject({ time: "13:05:00", label: d.motionPlay });
    key("PageUp");
    key("End");
    expect(scrubber()).toMatchObject({ time: "13:30:00", label: d.motionPlay });
    expect([page(), motion.isPaused()]).toEqual([{ paused: true, stored: "paused" }, true]);
    env.frames.run(2000);
    expect(scrubber().time).toBe("13:30:00");
  });

  it("stays paused when the visitor paused the simulation, whatever the animations do", async () => {
    const motion = await load({ observer: false });
    key("End");
    motion.setPaused(true);
    motion.setPaused(false);
    expect(playing()).toBe(false);
  });

  it("speaks the page's language: Dutch captions under Arabic chapter names", async () => {
    await load({ lang: "ar", reduce: true });
    expect(document.querySelector("#board .caps .tr")?.getAttribute("lang")).toBe("nl");
    expect(scrubber()).toMatchObject({ label: DICTS.ar.motionPlay, chapter: DICTS.ar.m_khutbah });
  });
});

describe("site: the board's play button before the board has started", () => {
  /** Whether the board has started: unlocked, its intro gone. */
  const board = () => ({
    locked: $("#scrubber").classList.contains("locked"),
    intro: document.querySelector(".intro-mark") !== null,
    time: scrubber().time,
  });

  it("pauses and plays the page, and remembers it, while the board waits", async () => {
    const motion = await load();
    $(".yt-play").click();
    expect(scrubber()).toMatchObject({ locked: true, play: false, label: d.motionPlay });
    expect(playing()).toBe(false);
    expect([page(), motion.isPaused()]).toEqual([{ paused: true, stored: "paused" }, true]);
    $(".yt-play").click();
    expect(scrubber()).toMatchObject({ locked: true, label: d.motionPause });
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
    // the page's switch from elsewhere (a reload that remembered it) shows on the button too
    motion.setPaused(true);
    expect(scrubber().label).toBe(d.motionPlay);
    motion.setPaused(false);
    expect(scrubber().label).toBe(d.motionPause);
    expect(board()).toEqual({ locked: true, intro: false, time: "12:45:00" });
  });

  it("paused before the board is in view, the board starts on its still picture, with Play", async () => {
    const motion = await load();
    $(".yt-play").click();
    intersect($("#board"), true);
    expect(board()).toEqual({ locked: false, intro: false, time: "13:07:49" });
    expect(lines()).toEqual(["blk past", "blk past", "blk verse"]);
    expect(scrubber().label).toBe(d.motionPlay);
    env.frames.run(2000);
    expect(scrubber().time).toBe("13:07:49");
    // then Play is the board's: it plays the board and everything else
    $(".yt-play").click();
    expect(playing()).toBe(true);
    expect([page(), motion.isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
  });

  it("played again before the board is in view, the intro runs and the Friday plays", async () => {
    const motion = await load();
    // as after a reload that remembered the pause
    motion.setPaused(true);
    $(".yt-play").click();
    expect(page()).toEqual({ paused: false, stored: "playing" });
    intersect($("#board"), true);
    expect(document.querySelector("svg.intro-mark")).not.toBeNull();
    landIntro();
    vi.advanceTimersByTime(450);
    expect(board()).toMatchObject({ locked: false, intro: false, time: "12:45:00" });
    expect(scrubber().label).toBe(d.motionPause);
    env.frames.run(2000);
    expect(scrubber().time > "12:45:20").toBe(true);
  });

  it("paused during the intro, the intro lands but the board stays still, with Play", async () => {
    const motion = await load();
    intersect($("#board"), true);
    env.frames.run(480);
    expect(document.querySelector("svg.intro-mark")).not.toBeNull();
    $(".yt-play").click();
    expect([page(), scrubber().label]).toEqual([{ paused: true, stored: "paused" }, d.motionPlay]);
    landIntro();
    vi.advanceTimersByTime(450);
    expect(board()).toEqual({ locked: false, intro: false, time: "13:07:49" });
    expect(lines()).toEqual(["blk past", "blk past", "blk verse"]);
    expect(scrubber().label).toBe(d.motionPlay);
    env.frames.run(2000);
    expect(scrubber().time).toBe("13:07:49");
    $(".yt-play").click();
    expect([playing(), motion.isPaused(), page().stored]).toEqual([true, false, "playing"]);
  });
});

describe("site: the scrubber", () => {
  /** The thumb's left (px): 7 px before the fill's edge, its centre on it. */
  const thumb = (): number => Number.parseFloat($(".yt-thumb").style.getPropertyValue("left"));
  const fills = (): string[] =>
    [...document.querySelectorAll<HTMLElement>(".yt-fill")].map((f) =>
      f.style.getPropertyValue("transform"),
    );
  const current = (): number[] =>
    [...document.querySelectorAll(".yt-ch")].flatMap((s, k) =>
      s.classList.contains("on") ? [k] : [],
    );
  const tip = () => ({
    name: $(".yt-tip-n").textContent,
    time: $(".yt-tip-t").textContent,
    at: $(".yt-tip").style.getPropertyValue("transform"),
  });

  it("shows where the Friday is: the chapters' fills, the thumb, the clock, for screen readers too", async () => {
    await load({ observer: false });
    expect([fills(), thumb(), current()]).toEqual([
      ["scaleX(0.0000)", "scaleX(0.0000)", "scaleX(0.0000)", "scaleX(0.0000)"],
      -7,
      [0],
    ]);
    expect(track().getAttribute("aria-valuetext")).toBe(`12:45:00 ${d.m_athan}`);
    key("End");
    expect([fills(), thumb(), current()]).toEqual([
      ["scaleX(1.0000)", "scaleX(1.0000)", "scaleX(1.0000)", "scaleX(1.0000)"],
      799,
      [3],
    ]);
    expect(track().getAttribute("aria-valuenow")).toBe("100");
    expect(track().getAttribute("aria-valuetext")).toBe(`13:30:00 ${d.m_salah}`);
  });

  it("jumps where the visitor clicks, and plays on from there", async () => {
    await load({ observer: false });
    pointer("pointerdown", 402);
    expect($("#scrubber").classList.contains("drag")).toBe(true);
    expect($("#board").classList.contains("jump")).toBe(true);
    // the middle of the khutbah: 13:05, half its fill
    expect(scrubber()).toMatchObject({ time: "13:05:00", chapter: d.m_khutbah });
    expect(fills()[1]).toBe("scaleX(0.5000)");
    expect(thumb()).toBe(295);
    const middle = (T.khutbah + T.iqama) / 2;
    expect(track().getAttribute("aria-valuenow")).toBe(String(Math.round((middle / T.end) * 100)));
    env.frames.run(1000);
    expect(scrubber().time).toBe("13:05:00");
    pointer("pointerup", 402);
    expect($("#scrubber").classList.contains("drag")).toBe(false);
    expect(scrubber().label).toBe(d.motionPause);
    env.frames.run(2000);
    expect(scrubber().time).toBe("13:07:23");
    env.frames.tick();
    expect($("#board").classList.contains("jump")).toBe(false);
  });

  it("shows each moment at once while dragging across chapters", async () => {
    await load({ observer: false });
    pointer("pointerdown", 604);
    expect([card(), scrubber().time]).toEqual(["iqama", "13:21:00"]);
    pointer("pointermove", 402);
    expect([card(), scrubber().time]).toEqual(["", "13:05:00"]);
    env.frames.run(640);
    expect($("#board").classList.contains("jump")).toBe(true);
    pointer("pointermove", 806);
    expect([card(), scrubber().chapter]).toEqual(["salah", d.m_salah]);
    track().dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1 }));
    expect($("#scrubber").classList.contains("drag")).toBe(false);
  });

  it("stays on the final hold when let go at the very end", async () => {
    await load({ observer: false });
    pointer("pointerdown", 906);
    expect(scrubber().time).toBe("13:30:00");
    track().dispatchEvent(new PointerEvent("lostpointercapture", { pointerId: 1 }));
    expect(scrubber().label).toBe(d.motionPlay);
    env.frames.run(2000);
    expect(scrubber().time).toBe("13:30:00");
    // a second release changes nothing
    pointer("pointerup", 906);
    expect(scrubber().label).toBe(d.motionPlay);
  });

  it("does not play on after a drag that began paused", async () => {
    await load({ reduce: true });
    pointer("pointerdown", 402);
    pointer("pointerup", 402);
    expect(playing()).toBe(false);
  });

  it("ignores other buttons, and drags even when the pointer cannot be captured", async () => {
    await load({ observer: false });
    pointer("pointerdown", 402, { button: 2 });
    expect($("#scrubber").classList.contains("drag")).toBe(false);
    expect(scrubber().time).toBe("12:45:00");
    track().setPointerCapture = () => {
      throw new DOMException("gone", "NotFoundError");
    };
    pointer("pointerdown", 402);
    expect([$("#scrubber").classList.contains("drag"), scrubber().time]).toEqual([
      true,
      "13:05:00",
    ]);
  });

  it("names the chapter and the time under the pointer, within the track", async () => {
    await load({ observer: false });
    pointer("pointerenter", 402);
    expect($("#scrubber").classList.contains("hover")).toBe(true);
    pointer("pointermove", 402);
    expect(tip()).toEqual({ name: d.m_khutbah, time: "13:05:00", at: "translateX(242.0px)" });
    // hovering never seeks
    expect(scrubber().time).toBe("12:45:00");
    pointer("pointermove", 0);
    expect(tip()).toEqual({ name: d.m_athan, time: "12:45:00", at: "translateX(0.0px)" });
    setProperty($(".yt-tip"), "offsetWidth", 150);
    pointer("pointermove", 2000);
    expect(tip()).toEqual({ name: d.m_salah, time: "13:30:00", at: "translateX(658.0px)" });
    pointer("pointerleave", 2000);
    expect($("#scrubber").classList.contains("hover")).toBe(false);
  });

  it("moves with the keys: the arrows, Home, and End to the final hold", async () => {
    await load({ observer: false });
    const right = key("ArrowRight");
    expect([right.defaultPrevented, scrubber().time]).toEqual([true, "12:45:34"]);
    expect(scrubber().label).toBe(d.motionPause);
    key("PageUp");
    expect(scrubber()).toMatchObject({ time: "12:50:00", chapter: d.m_khutbah });
    const end = key("End");
    expect(end.defaultPrevented).toBe(true);
    expect(scrubber()).toMatchObject({ time: "13:30:00", label: d.motionPlay });
    // End again, already paused
    key("End");
    expect(scrubber().label).toBe(d.motionPlay);
    key("Home");
    expect(scrubber().time).toBe("12:45:00");
    // other keys, and keys with a modifier, are the browser's
    const other = key("a");
    const ctrl = key("End", { ctrlKey: true });
    const alt = key("End", { altKey: true });
    const meta = key("End", { metaKey: true });
    expect([other, ctrl, alt, meta].map((e) => e.defaultPrevented)).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(scrubber().time).toBe("12:45:00");
  });

  it("plays the Friday again from the final hold", async () => {
    await load({ observer: false });
    key("End");
    $(".yt-play").click();
    expect(scrubber()).toMatchObject({ time: "12:45:00", label: d.motionPause });
    $(".yt-play").click();
    expect(scrubber().label).toBe(d.motionPlay);
    $(".yt-play").click();
    expect(scrubber().label).toBe(d.motionPause);
  });
});
