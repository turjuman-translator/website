// @vitest-environment happy-dom
// The home page's script (site/client/main.ts): the language hand-off, the chrome, a remembered
// pause and the "Pause animations" button at once, then everything that moves once the fonts are
// ready (or after 1.5 s), once: the dot field, the live headline, the board, the style demo, the
// verse and the prayer screen. The button (the board's play button) pauses and plays all of it.
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION_KEY, SITE_LANG_KEY } from "../../site/client/storage-keys.js";
import { HEADLINES, type SiteLang } from "../../site/content/khutbah.js";
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

async function load(lang: SiteLang = "en", o: { stored?: string; observer?: boolean } = {}) {
  env = install();
  showPage("home", lang);
  svgGeometry();
  setProperty(document.documentElement, "clientWidth", 1024);
  place($("#board"), { left: 100, top: 200, width: 800, height: 400 });
  if (o.stored !== undefined) localStorage.setItem(MOTION_KEY, o.stored);
  // Without the observer the board starts at once, without its logo intro.
  if (o.observer === false) Reflect.deleteProperty(globalThis, "IntersectionObserver");
  await import("../../site/client/main.js");
}

afterEach(cleanup);

function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`no ${selector}`);
  return node;
}
const started = () => ({
  dots: document.querySelectorAll("canvas.dotbg").length,
  headline: $(".a1-ar").classList.contains("live"),
  verse: $("#verse-demo").classList.contains("ready"),
  board: $("#home-mark").classList.contains("away"),
  style: $(".capdemo-stage").style.getPropertyValue("--k") !== "",
});
const flush = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};
/** What moves: the page-wide pause (and what this device remembers), the board's button, the
 *  headline's language and lit words, and the dot field's last picture. */
const motion = () => ({
  paused: document.documentElement.classList.contains("motion-paused"),
  stored: localStorage.getItem(MOTION_KEY),
  label: $(".yt-play").getAttribute("aria-label"),
});
const headline = () => ({
  lang: $(".a1-h").lang,
  lit: document.querySelectorAll(".a1-h .w.on").length,
  words: document.querySelectorAll(".a1-h .w").length,
});
const dots = (): string => JSON.stringify(env.contexts[0]?.dots ?? []);

describe("site: the home page's script", () => {
  it("wires the language and the chrome at once, and the rest when the fonts are ready, once", async () => {
    await load();
    expect(localStorage.getItem(SITE_LANG_KEY)).toBe("en");
    expect(started()).toEqual({
      dots: 0,
      headline: false,
      verse: false,
      board: false,
      style: false,
    });
    // Nothing paused, and nothing remembered for the visitor until they choose; the board's
    // button already works, before the board has started.
    expect(motion()).toEqual({ paused: false, stored: null, label: DICTS.en.motionPause });
    expect($<HTMLButtonElement>(".yt-play").disabled).toBe(false);
    env.fontsReady();
    await flush();
    expect(started()).toEqual({ dots: 1, headline: true, verse: true, board: true, style: true });
    const observers = FakeIntersectionObserver.all.length;
    vi.advanceTimersByTime(1500);
    expect(started().dots).toBe(1);
    expect(FakeIntersectionObserver.all).toHaveLength(observers);
    // the logo intro gathers the dot field's own dots
    intersect($("#board"), true);
    env.frames.tick();
    expect(document.querySelector("canvas.intro-dots")).not.toBeNull();
    expect(env.contexts[1]?.dots.length).toBeGreaterThan(0);
  });

  it("starts after 1.5 s when the fonts take longer", async () => {
    await load("nl");
    vi.advanceTimersByTime(1499);
    expect(started().headline).toBe(false);
    vi.advanceTimersByTime(1);
    expect(started()).toEqual({ dots: 1, headline: true, verse: true, board: true, style: true });
    env.fontsReady();
    await flush();
    expect(started().dots).toBe(1);
  });

  it("shows Dutch captions on the Arabic page, with its own words around them", async () => {
    await load("ar");
    env.fontsReady();
    await flush();
    expect(localStorage.getItem(SITE_LANG_KEY)).toBe("ar");
    expect($(".a1-h").textContent).toBe(HEADLINES.find(([l]) => l === "nl")?.[1]);
    expect($(".yt-play").getAttribute("aria-label")).toBe(DICTS.ar.motionPause);
    expect($(".yt-play").dataset).toMatchObject({
      play: DICTS.ar.motionPlay,
      pause: DICTS.ar.motionPause,
    });
    expect(document.querySelector("#motion")).toBeNull();
  });
});

describe("site: the board's play button pauses the whole home page", () => {
  it("pauses and plays the board, the headline and the dots, and remembers it", async () => {
    await load("en", { observer: false });
    env.fontsReady();
    await flush();
    expect(motion()).toEqual({ paused: false, stored: null, label: DICTS.en.motionPause });
    env.frames.run(2600, 50);
    // the headline moved on to its next language, and the dots drift
    const moving = headline();
    expect(moving.lang).not.toBe("en");
    const before = dots();
    env.frames.run(500, 50);
    expect(dots()).not.toBe(before);

    $(".yt-play").click();
    expect(motion()).toEqual({ paused: true, stored: "paused", label: DICTS.en.motionPlay });
    // paused, the headline shows its whole line and stays on it; the dots stand still
    const still = { head: headline(), dots: dots(), time: $(".yt-time").textContent };
    expect(still.head).toMatchObject({ lang: moving.lang, lit: still.head.words });
    env.frames.run(10_000, 50);
    expect({ head: headline(), dots: dots(), time: $(".yt-time").textContent }).toEqual(still);

    $(".yt-play").click();
    expect(motion()).toEqual({ paused: false, stored: "playing", label: DICTS.en.motionPause });
    env.frames.run(5000, 50);
    expect(headline().lang).not.toBe(moving.lang);
    expect(dots()).not.toBe(still.dots);
    expect($(".yt-time").textContent).not.toBe(still.time);
  });

  it("pauses the headline and the dots before the board is in view, remembers it, and the board starts still", async () => {
    await load();
    env.fontsReady();
    await flush();
    env.frames.run(2600, 50);
    const moving = headline();
    expect(moving.lang).not.toBe("en");
    // the board is still waiting for the visitor to scroll to it
    expect($("#scrubber").classList.contains("locked")).toBe(true);

    $(".yt-play").click();
    expect(motion()).toEqual({ paused: true, stored: "paused", label: DICTS.en.motionPlay });
    const still = { head: headline(), dots: dots() };
    expect(still.head).toMatchObject({ lang: moving.lang, lit: still.head.words });
    env.frames.run(10_000, 50);
    expect({ head: headline(), dots: dots() }).toEqual(still);

    // scrolled to: no logo intro, the still picture and Play
    intersect($("#board"), true);
    expect(document.querySelector(".intro-mark")).toBeNull();
    expect($("#scrubber").classList.contains("locked")).toBe(false);
    expect(document.querySelector("#board .caps .blk.verse .tr.on")).not.toBeNull();
    expect(motion().label).toBe(DICTS.en.motionPlay);
    env.frames.run(2000, 50);
    expect({ head: headline(), dots: dots() }).toEqual(still);

    $(".yt-play").click();
    expect(motion()).toEqual({ paused: false, stored: "playing", label: DICTS.en.motionPause });
    env.frames.run(7000, 50);
    expect(headline().lang).not.toBe(still.head.lang);
    expect(dots()).not.toBe(still.dots);
  });

  it("after a reload, a remembered pause shows Play on the still board, and Play moves everything", async () => {
    await load("nl", { stored: "paused" });
    // paused at once, before the fonts and before anything starts, and the button says Play
    expect(motion()).toEqual({ paused: true, stored: "paused", label: DICTS.nl.motionPlay });
    expect($<HTMLButtonElement>(".yt-play").disabled).toBe(false);
    env.fontsReady();
    await flush();
    const head = headline();
    expect(head.lit).toBe(head.words);
    intersect($("#board"), true);
    // no logo intro: the still picture (the verse, fully said) and Play, at once
    expect(document.querySelector(".intro-mark")).toBeNull();
    expect($("#scrubber").classList.contains("locked")).toBe(false);
    expect(document.querySelector("#board .caps .blk.verse .tr.on")).not.toBeNull();
    expect(motion()).toEqual({ paused: true, stored: "paused", label: DICTS.nl.motionPlay });
    const time = $(".yt-time").textContent;
    env.frames.run(5000, 50);
    expect([headline(), $(".yt-time").textContent]).toEqual([head, time]);

    $(".yt-play").click();
    expect(motion()).toEqual({ paused: false, stored: "playing", label: DICTS.nl.motionPause });
    env.frames.run(3000, 50);
    expect(headline().lang).not.toBe(head.lang);
    expect($(".yt-time").textContent).not.toBe(time);
  });
});
