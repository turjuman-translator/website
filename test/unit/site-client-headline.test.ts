// @vitest-environment happy-dom
// The live headline (site/client/headline.ts): the Arabic line lights up word by word, the
// translation follows just behind it, cycling through six languages; the page reserves the height
// of the tallest translation; paused or under reduced motion the whole line shows.
import { afterEach, describe, expect, it } from "vitest";
import { HEADLINES, LANG_NAMES, type SiteLang } from "../../site/content/khutbah.js";
import {
  cleanup,
  type Env,
  install,
  intersect,
  setProperty,
  showPage,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(o: { reduce?: boolean; lang?: SiteLang } = {}) {
  env = install(o);
  showPage("home", o.lang ?? "en");
  const motion = await import("../../site/client/motion.js");
  const { liveHeadline } = await import("../../site/client/headline.js");
  return { liveHeadline, motion };
}

afterEach(cleanup);

const stage = (): HTMLElement => {
  const s = document.querySelector<HTMLElement>(".a1-stage");
  if (s === null) throw new Error("no headline");
  return s;
};
const line = (): HTMLElement => stage().querySelector<HTMLElement>(".a1-h") ?? stage();
/** What the headline shows: the translation's language, its words (lit or not), the Arabic. */
const shown = () => ({
  lang: line().lang,
  pair: stage().querySelector(".a1-pair span")?.textContent,
  text: line().textContent,
  lit: [...line().querySelectorAll(".w")].map((w) => w.classList.contains("on")),
  arabic: [...stage().querySelectorAll(".aw")].map((w) => w.classList.contains("on")),
});
const text = (lang: string): string => HEADLINES.find(([l]) => l === lang)?.[1] ?? "";
const all = (n: number, on: boolean): boolean[] => Array.from({ length: n }, () => on);

describe("site: the live headline", () => {
  it("starts with the whole line in the page's caption language", async () => {
    const { liveHeadline } = await load({ lang: "ar" });
    liveHeadline(stage(), "nl");
    expect(shown()).toEqual({
      lang: "nl",
      pair: "Nederlands",
      text: text("nl"),
      lit: all(5, true),
      arabic: all(4, true),
    });
    expect(stage().querySelector(".a1-ar")?.classList.contains("live")).toBe(true);
  });

  it("starts with English for a language it does not cycle through", async () => {
    const { liveHeadline } = await load();
    liveHeadline(stage(), "xx");
    expect(shown()).toMatchObject({ lang: "en", pair: LANG_NAMES.en, text: text("en") });
  });

  it("says the Arabic word by word, the translation following, then turns to the next language", async () => {
    const { liveHeadline } = await load();
    liveHeadline(stage(), "en");
    env.frames.tick();
    // 1.8 s of the whole English line first
    env.frames.run(1750, 50);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, true), arabic: all(4, true) });
    // then it clears
    env.frames.run(100, 50);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, false), arabic: all(4, false) });
    // and the Dutch line begins: the first Arabic word is said, no Dutch word yet
    env.frames.run(400, 50);
    expect(shown()).toEqual({
      lang: "nl",
      pair: "Nederlands",
      text: text("nl"),
      lit: all(5, false),
      arabic: [true, false, false, false],
    });
    // 1.5 s later: the whole Arabic line, and four of the five Dutch words
    env.frames.run(1500, 50);
    expect(shown()).toMatchObject({ arabic: all(4, true), lit: [true, true, true, true, false] });
    // it holds the whole line, then clears for Turkish
    env.frames.run(3350, 50);
    expect(shown()).toMatchObject({ lang: "nl", lit: all(5, true), arabic: all(4, true) });
    env.frames.run(150, 50);
    expect(shown()).toMatchObject({ lang: "nl", lit: all(5, false) });
    env.frames.run(400, 50);
    expect(shown()).toMatchObject({ lang: "tr", pair: LANG_NAMES.tr, text: text("tr") });
  });

  it("goes round all six languages, back to the first", async () => {
    const { liveHeadline } = await load();
    liveHeadline(stage(), "id");
    env.frames.tick();
    env.frames.run(1800 + 450, 50);
    expect(shown().lang).toBe("en");
  });

  it("shows the whole line while paused, and waits", async () => {
    const { liveHeadline, motion } = await load();
    liveHeadline(stage(), "en");
    env.frames.tick();
    env.frames.run(1850, 50);
    expect(shown().lit).toEqual(all(6, false));
    motion.setPaused(true);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, true), arabic: all(4, true) });
    env.frames.run(10_000, 50);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, true) });
    motion.setPaused(false);
    env.frames.run(400, 50);
    expect(shown().lang).toBe("nl");
  });

  it("waits while it is scrolled out of view", async () => {
    const { liveHeadline } = await load();
    liveHeadline(stage(), "en");
    env.frames.tick();
    intersect(stage(), false);
    env.frames.run(5000, 50);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, true) });
    intersect(stage(), true);
    env.frames.run(2300, 50);
    expect(shown().lang).toBe("nl");
  });

  it("keeps the whole line still under reduced motion", async () => {
    const { liveHeadline } = await load({ reduce: true });
    liveHeadline(stage(), "en");
    expect(env.frames.pending).toBe(0);
    expect(shown()).toMatchObject({ lang: "en", lit: all(6, true), arabic: all(4, true) });
  });
});

describe("site: the headline's height", () => {
  /** A browser's layout of the headline: 10 px a character, 30 px a line, and the probe's own
   *  min-height (an inline style wins over the stylesheet's .a1-probe { min-height: 0 }). */
  function layout(width: () => number): void {
    env.measure = (el) => {
      if (!(el instanceof HTMLElement) || !el.classList.contains("a1-h")) return undefined;
      if (!el.classList.contains("a1-probe"))
        return { left: 0, top: 0, width: width(), height: 60 };
      const w = Number.parseFloat(el.style.getPropertyValue("width"));
      const lines = Math.ceil(((el.textContent ?? "").length * 10) / w);
      const min = Number.parseFloat(el.style.getPropertyValue("min-height")) || 0;
      return { left: 0, top: 0, width: w, height: Math.max(min, lines * 30) };
    };
  }
  const reserved = (): string => line().style.getPropertyValue("min-height");

  it("reserves the height of the tallest translation, so the page never jumps", async () => {
    const { liveHeadline } = await load();
    let width = 200;
    layout(() => width);
    liveHeadline(stage(), "en");
    // the Turkish line, 44 characters: three lines at 200 px
    expect(reserved()).toBe("90px");
    expect(document.querySelector(".a1-probe")).toBeNull();
    width = 450;
    window.dispatchEvent(new Event("resize"));
    expect(reserved()).toBe("30px");
  });

  it("measures again on a narrower window", async () => {
    const { liveHeadline } = await load();
    let width = 450;
    layout(() => width);
    liveHeadline(stage(), "en");
    expect(reserved()).toBe("30px");
    width = 300;
    setProperty(window, "innerWidth", 300);
    window.dispatchEvent(new Event("resize"));
    expect(reserved()).toBe("60px");
  });
});
