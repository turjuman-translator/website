// The home page's demos, played in Chrome with Playwright's clock (the animations run on
// requestAnimationFrame and timers, so page time can be moved on at will): the live headline, the
// board with its logo intro, its simulated Friday (Athan, the khutbah with its captions, Iqama and
// Salah) and its scrubber, whose play button pauses and plays everything that moves ("Pause
// animations"), the verse, the prayer screen, the caption-style demo, and the still pictures a
// visitor who asked for reduced motion gets.
import type { Page } from "playwright-core";
import { describe, test } from "vitest";
import { demoOptions, presetShowsSource } from "../../../site/client/caption-theme.js";
import { MOTION_KEY } from "../../../site/client/storage-keys.js";
import {
  captionLang,
  HEADLINE_AR,
  HEADLINES,
  KHUTBAH,
  LANG_NAMES,
  PHRASES,
  VERSE,
} from "../../../site/content/khutbah.js";
import { DICTS } from "../../../site/content/strings.js";
import { BUILTIN_PRESETS, DEFAULT_PRESET_ID } from "../../../src/shared/theme.js";
import {
  advanceUntil,
  inPage,
  type OpenOptions,
  openSitePage,
  pathOf,
  type Site,
  type SiteLang,
  type SitePageHandle,
} from "../helpers/website.js";
import { attrOf, boxOf, reveal, textOf } from "../helpers/website-dom.js";

interface BoardState {
  card: string;
  intro: boolean;
  introMark: boolean;
  locked: boolean;
  time: string;
  chapter: string;
  label: string;
  disabled: boolean;
  value: string;
  valuetext: string;
  blocks: Array<{
    verse: boolean;
    ar: string;
    arOn: number;
    arWords: number;
    tr: string;
    trOn: number;
    trWords: number;
    trSettled: boolean;
  }>;
  /** The prayer cards that show their name (the moment was recognised). */
  named: string[];
  /** The Arabic lines of the prayer card on screen, and whether each is Quran. */
  lines: Array<{ ar: string; quran: boolean }>;
}

const BOARD = `() => {
  const board = document.getElementById("board");
  const play = document.querySelector(".yt-play");
  const track = document.querySelector(".yt-track");
  const words = (el, on) => el === null ? 0 : el.querySelectorAll(on ? ".w.on" : ".w").length;
  return {
    card: board.dataset.card ?? "",
    intro: board.classList.contains("intro"),
    introMark: document.querySelector(".intro-mark") !== null,
    locked: document.getElementById("scrubber").classList.contains("locked"),
    time: document.querySelector(".yt-time").textContent,
    chapter: document.querySelector(".yt-chap").textContent,
    label: play.getAttribute("aria-label"),
    disabled: play.disabled,
    value: track.getAttribute("aria-valuenow"),
    valuetext: track.getAttribute("aria-valuetext") ?? "",
    blocks: [...board.querySelectorAll(".caps .blk")].map((b) => ({
      verse: b.classList.contains("verse"),
      ar: b.querySelector(".ar").textContent,
      arOn: words(b.querySelector(".ar"), true),
      arWords: words(b.querySelector(".ar"), false),
      tr: b.querySelector(".tr").textContent,
      trOn: words(b.querySelector(".tr"), true),
      trWords: words(b.querySelector(".tr"), false),
      trSettled: b.querySelector(".tr").classList.contains("on"),
    })),
    named: [...board.querySelectorAll(".bcard.det")].map((c) => c.classList[1]),
    lines: [...board.querySelectorAll(".bcard." + (board.dataset.card || "none") + " .bc-line")].map((l) => ({
      ar: l.textContent,
      quran: l.classList.contains("q"),
    })),
  };
}`;

function board(page: Page): Promise<BoardState> {
  return inPage<BoardState>(page, BOARD);
}

interface MotionState {
  /** Everything on the page is paused (the root's class), and what this device remembers. */
  paused: boolean;
  stored: string | null;
  /** The board's play button, the switch for all of it. */
  label: string;
  /** The headline's language, the prayer screen's card and the dot field's picture. */
  head: string;
  card: string;
  dots: string;
}

const MOTION = `(key) => ({
  paused: document.documentElement.classList.contains("motion-paused"),
  stored: localStorage.getItem(key),
  label: document.querySelector(".yt-play").getAttribute("aria-label"),
  head: document.querySelector(".a1-h").lang,
  card: document.querySelector("#prayer-demo .tj-screen").dataset.card,
  dots: document.querySelector("canvas.dotbg").toDataURL(),
})`;

function motion(page: Page): Promise<MotionState> {
  return inPage<MotionState>(page, MOTION, MOTION_KEY);
}

/** Presses the board's play button with the keyboard without scrolling to it: a click would bring
 *  the board into view first, and with it the board's start. */
async function pressPlay(page: Page): Promise<void> {
  await page.evaluate("document.querySelector('.yt-play').focus({ preventScroll: true })");
  await page.keyboard.press("Enter");
}

/** Consecutive repeats dropped, and the empty value. */
function steps(values: readonly string[]): string[] {
  return values.filter((v, i) => v !== "" && v !== values[i - 1]);
}

const LOCKED = "document.getElementById('scrubber').classList.contains('locked')";

/** Scrolls the board into view and lets its logo intro play until the simulation starts. The
 *  mark's last glide is a Web Animation, which runs in real time. */
async function landIntro(page: Page): Promise<void> {
  await reveal(page, "#board");
  await advanceUntil(page, "document.querySelector('.intro-mark') !== null", "the intro starts", {
    realMs: 20,
  });
  await advanceUntil(page, `!${LOCKED}`, "the board starts after its intro", {
    realMs: 60,
    max: 20_000,
  });
}

async function home(site: Site, lang: SiteLang, opts: OpenOptions = {}): Promise<SitePageHandle> {
  const tab = await openSitePage(site.browser, { clock: true, ...opts });
  await tab.goto(`${site.servers.hosted.url}${pathOf("hosted", lang, "home")}`);
  // From here on page time only moves when the test moves it. Until then it runs, so on a busy
  // machine it can pass the moment chosen ("Cannot fast-forward to the past"): then choose again.
  for (let tries = 1; ; tries++) {
    const now = await tab.page.evaluate<number>("Date.now()");
    try {
      await tab.page.clock.pauseAt(now + 50);
      return tab;
    } catch (err) {
      if (tries === 5 || !String(err).includes("to the past")) {
        await tab.close();
        throw err;
      }
    }
  }
}

/** The centre (y) and a point at `f` (0…1) along chapter `k`'s bar of the scrubber. */
async function barPoint(page: Page, k: number, f: number): Promise<{ x: number; y: number }> {
  const box = await boxOf(page, `.yt-ch[data-k="${k}"] .yt-bar`);
  if (box === null) throw new Error(`no scrubber chapter ${k}`);
  return { x: box.left + box.width * f, y: box.top + box.height / 2 };
}

export function homeSuite(site: () => Site): void {
  describe.concurrent("the home page's demos", () => {
    test("the board plays a Friday after its intro: the Athan, the khutbah with live captions, the Iqama and the Salah", async ({
      expect,
    }) => {
      const d = DICTS.en;
      const tab = await home(site(), "en");
      const { page } = tab;
      /** Plays `ms` of page time, looking at the board every 250 ms. */
      const play = async (ms: number): Promise<BoardState[]> => {
        const seen: BoardState[] = [];
        for (let t = 0; t < ms; t += 250) {
          await page.clock.runFor(250);
          seen.push(await board(page));
        }
        return seen;
      };
      /** Seeks (a key on the scrubber) to 3 s before chapter `k + 1` begins. */
      const seekBefore = async (k: number): Promise<void> => {
        await page.keyboard.press("Home");
        for (let i = 0; i < k; i++) await page.keyboard.press("PageUp");
        await page.keyboard.press("ArrowLeft");
      };
      try {
        // Before it is in view: the intro is waiting and the scrubber is dimmed and inert, but its
        // play button already works (it pauses the page).
        expect(await board(page)).toMatchObject({
          intro: true,
          introMark: false,
          locked: true,
          disabled: false,
          label: d.motionPause,
          time: "12:45:00",
          chapter: d.m_athan,
        });
        await landIntro(page);
        expect(await board(page)).toMatchObject({
          intro: false,
          introMark: false,
          locked: false,
          disabled: false,
          label: d.motionPause,
        });

        // The Athan: its card is named and its phrases stack up as they are said.
        const athan = await play(4000);
        expect(steps(athan.map((s) => s.card))).toEqual(["athan"]);
        const said = athan.at(-1);
        expect(said?.named).toEqual(["athan"]);
        expect(said?.lines.map((l) => l.ar)).toContain(PHRASES.athan[0]?.ar);
        expect(said?.time).toMatch(/^12:4[5-9]:\d\d$/);
        expect(said?.time).not.toBe("12:45:00");

        // Into the khutbah: the Athan's card goes and the captions come, word by word, the
        // translation just behind the Arabic, at most three lines, the verse settling whole.
        await page.locator(".yt-track").focus();
        await seekBefore(1);
        const khutbah = await play(15_000);
        expect(steps(khutbah.map((s) => s.chapter))).toEqual([d.m_athan, d.m_khutbah]);
        expect(steps(khutbah.map((s) => s.card))).toEqual(["athan"]);
        expect(khutbah.filter((s) => s.card !== "").every((s) => s.blocks.length === 0)).toBe(true);
        const blocks = khutbah.flatMap((s) => s.blocks);
        expect([...new Set(blocks.map((b) => b.ar))]).toEqual(KHUTBAH.slice(0, 3).map((l) => l.ar));
        expect(blocks.some((b) => b.arOn > 0 && b.arOn < b.arWords)).toBe(true);
        expect(blocks.some((b) => b.trOn > 0 && b.trOn < b.trWords)).toBe(true);
        expect(Math.max(...khutbah.map((s) => s.blocks.length))).toBeLessThanOrEqual(3);
        const [opening, , verse] = KHUTBAH;
        const first = blocks.filter((b) => b.ar === opening?.ar).at(-1);
        expect(first?.tr.replace(/\s+/g, " ").trim()).toBe(opening?.en);
        expect([first?.arOn, first?.trOn]).toEqual([first?.arWords, first?.trWords]);
        const recited = khutbah.at(-1)?.blocks.find((b) => b.verse);
        expect(recited).toMatchObject({ trSettled: true, tr: `${verse?.en}${verse?.verse?.ref}` });

        // Into the Iqama: the captions clear and its card takes over.
        await seekBefore(2);
        const iqama = await play(6000);
        expect(steps(iqama.map((s) => s.chapter))).toEqual([d.m_khutbah, d.m_iqama]);
        expect(steps(iqama.map((s) => s.card))).toEqual(["iqama"]);
        expect(iqama.at(-1)).toMatchObject({ card: "iqama", named: ["iqama"], blocks: [] });

        // Into the Salah: its recitation is marked as Quran.
        await seekBefore(3);
        const salah = await play(6000);
        expect(steps(salah.map((s) => s.chapter))).toEqual([d.m_iqama, d.m_salah]);
        expect(steps(salah.map((s) => s.card))).toEqual(["iqama", "salah"]);
        expect(salah.at(-1)?.lines.some((l) => l.quran)).toBe(true);
        expect(
          Math.max(...[...athan, ...iqama, ...salah].map((s) => s.lines.length)),
        ).toBeLessThanOrEqual(5);

        // The end: the final picture holds; Play starts the Friday again.
        await page.keyboard.press("End");
        const end = await board(page);
        expect(end).toMatchObject({ time: "13:30:00", card: "salah", label: d.motionPlay });
        expect(await play(1000)).toEqual([end, end, end, end]);
        await page.locator(".yt-play").click();
        const again = await play(1000);
        expect(again.at(-1)).toMatchObject({
          chapter: d.m_athan,
          card: "athan",
          label: d.motionPause,
        });
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("on a phone, the board's intro lands and the Friday plays, inside the screen", async ({
      expect,
    }) => {
      const tab = await home(site(), "nl", { mobile: true });
      const { page } = tab;
      try {
        await landIntro(page);
        const start = await board(page);
        expect(start).toMatchObject({
          intro: false,
          introMark: false,
          label: DICTS.nl.motionPause,
        });
        await page.clock.runFor(3000);
        const later = await board(page);
        expect(later.card).toBe("athan");
        expect(later.time > start.time).toBe(true);
        const box = await boxOf(page, "#board");
        expect(box?.left ?? -1).toBeGreaterThanOrEqual(0);
        expect(box?.right ?? 999).toBeLessThanOrEqual(390);
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the scrubber seeks by key, click and drag, names the chapter under the pointer, and plays and pauses", async ({
      expect,
    }) => {
      const d = DICTS.nl;
      const tab = await home(site(), "nl");
      const { page } = tab;
      try {
        await landIntro(page);
        const track = page.locator(".yt-track");
        expect(await track.getAttribute("tabindex")).toBe("0");
        await track.focus();
        const key = async (k: string): Promise<BoardState> => {
          await page.keyboard.press(k);
          return board(page);
        };
        expect(await key("Home")).toMatchObject({
          time: "12:45:00",
          chapter: d.m_athan,
          value: "0",
        });
        expect(await key("PageUp")).toMatchObject({ time: "12:50:00", chapter: d.m_khutbah });
        expect(await key("PageUp")).toMatchObject({
          time: "13:20:00",
          chapter: d.m_iqama,
          card: "iqama",
        });
        expect(await key("PageUp")).toMatchObject({ time: "13:22:00", chapter: d.m_salah });
        // The last PageUp (and End) stops on the final picture instead of starting over.
        const end = await key("PageUp");
        expect(end).toMatchObject({ time: "13:30:00", value: "100", label: d.motionPlay });
        expect(end.valuetext).toBe(`13:30:00 ${d.m_salah}`);
        await page.clock.runFor(3000);
        expect((await board(page)).time).toBe("13:30:00");
        expect(await key("PageDown")).toMatchObject({ time: "13:22:00", chapter: d.m_salah });
        expect((await key("ArrowLeft")).chapter).toBe(d.m_iqama);
        expect((await key("ArrowRight")).chapter).toBe(d.m_salah);
        expect(await key("End")).toMatchObject({ time: "13:30:00", label: d.motionPlay });
        // End stops the simulation only: the page is not paused, and the dots drift on.
        const ended = await motion(page);
        expect(ended).toMatchObject({ paused: false, stored: null, label: d.motionPlay });
        await page.clock.runFor(1000);
        expect((await motion(page)).dots).not.toBe(ended.dots);

        // Play from the end starts the Friday again; pause holds it.
        await page.locator(".yt-play").click();
        await page.clock.runFor(1000);
        expect(await board(page)).toMatchObject({ chapter: d.m_athan, label: d.motionPause });
        await page.locator(".yt-play").click();
        const held = await board(page);
        expect(held.label).toBe(d.motionPlay);
        await page.clock.runFor(3000);
        expect((await board(page)).time).toBe(held.time);
        await page.locator(".yt-play").click();

        // A click in the khutbah's bar goes there, and the simulation plays on.
        const mid = await barPoint(page, 1, 0.5);
        await page.mouse.click(mid.x, mid.y);
        const clicked = await board(page);
        expect(clicked).toMatchObject({ chapter: d.m_khutbah, label: d.motionPause });
        expect(clicked.time >= "13:03:00" && clicked.time <= "13:07:00", clicked.time).toBe(true);
        await page.clock.runFor(2000);
        expect((await board(page)).time > clicked.time).toBe(true);

        // Hovering names the chapter and the clock time under the pointer.
        const over = await barPoint(page, 2, 0.5);
        await page.mouse.move(over.x, over.y);
        expect(await attrOf(page, "#scrubber", "class")).toContain("hover");
        expect(await textOf(page, ".yt-tip-n")).toBe(d.m_iqama);
        expect(await textOf(page, ".yt-tip-t")).toMatch(/^13:2[01]:\d\d$/);

        // A drag shows every moment at once, and lets the simulation play on when let go.
        const from = await barPoint(page, 1, 0.2);
        const to = await barPoint(page, 3, 0.5);
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        expect(await attrOf(page, "#scrubber", "class")).toContain("drag");
        expect(await attrOf(page, "#board", "class")).toContain("jump");
        await page.mouse.move(to.x, to.y, { steps: 8 });
        expect(await board(page)).toMatchObject({ chapter: d.m_salah, card: "salah" });
        await page.mouse.up();
        expect(await attrOf(page, "#scrubber", "class")).not.toContain("drag");
        expect((await board(page)).label).toBe(d.motionPause);
        await page.mouse.move(0, 0);
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the prayer screen steps through Athan, Iqama and Salah by itself, and a tap picks one", async ({
      expect,
    }) => {
      const d = DICTS.ar;
      const tab = await home(site(), "ar");
      const { page } = tab;
      const state = (): Promise<{ card: string; pressed: string[] }> =>
        inPage(
          page,
          `() => ({
            card: document.querySelector("#prayer-demo .tj-screen").dataset.card,
            pressed: [...document.querySelectorAll("#prayer-demo [data-moment]")]
              .filter((b) => b.getAttribute("aria-pressed") === "true")
              .map((b) => b.dataset.moment),
          })`,
        );
      try {
        expect(
          await inPage(
            page,
            "() => [...document.querySelectorAll('#prayer-demo [data-moment]')].map((b) => b.textContent)",
          ),
        ).toEqual([d.m_athan, d.m_iqama, d.m_salah]);
        await reveal(page, "#prayer-demo");
        expect(await state()).toEqual({ card: "iqama", pressed: ["iqama"] });
        const order: string[] = [];
        for (let i = 0; i < 3; i++) {
          await page.clock.runFor(3300);
          order.push((await state()).card);
        }
        expect(order).toEqual(["salah", "athan", "iqama"]);

        await page.locator('#prayer-demo [data-moment="athan"]').click();
        expect(await state()).toEqual({ card: "athan", pressed: ["athan"] });
        // A moment the visitor picked stays a little longer.
        await page.clock.runFor(5000);
        expect((await state()).card).toBe("athan");
        await page.clock.runFor(2500);
        expect(await state()).toEqual({ card: "iqama", pressed: ["iqama"] });
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the headline says the line in Arabic, and translates it into the next language in turn", async ({
      expect,
    }) => {
      // English starts in English; the Arabic page's demos translate into Dutch.
      for (const [lang, switches, ms] of [
        ["en", 2, 9000],
        ["ar", 1, 5000],
      ] as const) {
        const tab = await home(site(), lang);
        const { page } = tab;
        const state = (): Promise<{ lang: string; text: string; name: string; on: number }> =>
          inPage(
            page,
            `() => ({
              lang: document.querySelector(".a1-h").lang,
              text: document.querySelector(".a1-h").textContent,
              name: document.querySelector(".a1-pair span").textContent,
              on: document.querySelectorAll(".a1-ar .aw.on").length,
            })`,
          );
        try {
          const words = HEADLINE_AR.split(" ").length;
          const first = captionLang(lang);
          const start = HEADLINES.findIndex(([l]) => l === first);
          expect(await state()).toEqual({
            lang: first,
            text: HEADLINES[start]?.[1],
            name: LANG_NAMES[first],
            on: words,
          });
          const order: string[] = [];
          const lit: number[] = [];
          for (let t = 0; t < ms; t += 250) {
            await page.clock.runFor(250);
            const s = await state();
            lit.push(s.on);
            if (s.lang !== (order.at(-1) ?? first)) {
              order.push(s.lang);
              const line = HEADLINES.find(([l]) => l === s.lang);
              expect([s.text, s.name], s.lang).toEqual([line?.[1], LANG_NAMES[s.lang]]);
            }
          }
          expect(order).toEqual(
            Array.from(
              { length: switches },
              (_, i) => HEADLINES[(start + 1 + i) % HEADLINES.length]?.[0],
            ),
          );
          // The Arabic clears, then lights up one word after the other.
          expect(lit).toContain(0);
          expect(new Set(lit.filter((n) => n > 0 && n < words)).size, lang).toBeGreaterThan(1);
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });

    test("the verse lights up word by word, then its translation settles", async ({ expect }) => {
      const tab = await home(site(), "nl");
      const { page } = tab;
      const state = (): Promise<{ lit: number; words: number; settled: boolean; text: string }> =>
        inPage(
          page,
          `() => ({
            lit: document.querySelectorAll("#verse-demo .vd-ar .w.lit").length,
            words: document.querySelectorAll("#verse-demo .vd-ar .w").length,
            settled: document.querySelector("#verse-demo .vd-tr").classList.contains("on"),
            text: document.querySelector("#verse-demo .vd-tr").textContent,
          })`,
        );
      try {
        await reveal(page, "#verse-demo");
        const first = await state();
        expect(first.words).toBe(VERSE.ar.split(" ").length);
        expect(first.text).toBe(`${VERSE.nl}${VERSE.verse?.ref}`);
        const seen: Array<{ lit: number; settled: boolean }> = [];
        for (let t = 0; t < 12_000; t += 260) {
          await page.clock.runFor(260);
          const s = await state();
          seen.push({ lit: s.lit, settled: s.settled });
        }
        const counts = seen.map((s) => s.lit);
        expect(new Set(counts).size, "lit one word at a time").toBeGreaterThan(first.words / 2);
        expect(Math.max(...counts)).toBe(first.words);
        // The translation only settles once the first words are said, and the verse starts over.
        expect(seen.filter((s) => s.settled).every((s) => s.lit >= 4)).toBe(true);
        expect(seen.some((s) => s.settled)).toBe(true);
        expect(counts.lastIndexOf(0)).toBeGreaterThan(counts.indexOf(first.words));
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the caption-style demo dresses the preview in each look, layout, size and background", async ({
      expect,
    }) => {
      const tab = await openSitePage(site().browser);
      const { page } = tab;
      const preview = (): Promise<{
        pressed: string[];
        blocks: { hidden: boolean; cls: string };
        rollup: { hidden: boolean; cls: string };
        source: boolean;
        behind: string;
        size: string;
        src: boolean;
        quran: boolean;
        fontSize: string;
      }> =>
        inPage(
          page,
          `() => {
            const q = (s) => document.querySelector(s);
            return {
              pressed: [...document.querySelectorAll("#custom [aria-pressed='true']")].map((b) => b.dataset.preset ?? b.dataset.layout ?? b.dataset.behind),
              blocks: { hidden: q(".capdemo .blk-root").hidden, cls: q(".capdemo .blk-root").className },
              rollup: { hidden: q(".capdemo .cap-root").hidden, cls: q(".capdemo .cap-root").className },
              source: !q(".capdemo .cap-source").hidden,
              behind: q(".capdemo").dataset.behind,
              size: q("#cd-size").value,
              src: q("#cd-src").checked,
              quran: q("#cd-quran").checked,
              fontSize: getComputedStyle(q(".capdemo-stage")).getPropertyValue("--cap-font-size").trim(),
            };
          }`,
        );
      try {
        await tab.goto(`${site().servers.hosted.url}/`);
        await reveal(page, "#custom");
        expect((await preview()).pressed).toEqual([DEFAULT_PRESET_ID, "blocks", "camera"]);
        let quran = true;
        for (const p of BUILTIN_PRESETS) {
          await page.locator(`.cd-chip[data-preset="${p.id}"]`).click();
          const o = demoOptions(p, {
            preset: p.id,
            layout: null,
            size: null,
            src: presetShowsSource(p),
            quran,
            behind: "camera",
          });
          const shown = await preview();
          expect(shown.pressed, p.id).toEqual([p.id, o.layout, "camera"]);
          expect(shown.blocks, p.id).toEqual({
            hidden: o.layout !== "blocks",
            cls: `blk-root pos-${o.pos} bg-${o.bg} show-${o.show}${o.quranArabic ? " quran-ar" : ""}`,
          });
          expect(shown.rollup, p.id).toEqual({
            hidden: o.layout !== "rollup",
            cls: `cap-root pos-${o.pos} bg-${o.bg}`,
          });
          expect([shown.size, shown.src, shown.source], p.id).toEqual([
            String(o.size),
            o.show === "both",
            o.show === "both",
          ]);
          // Switch the Quran line on and off along the way.
          await page.locator("#cd-quran").click();
          quran = !quran;
          expect((await preview()).blocks.cls.includes("quran-ar"), p.id).toBe(quran);
        }

        await page.locator(`.cd-chip[data-preset="${DEFAULT_PRESET_ID}"]`).click();
        await page.locator('.cd-btn[data-layout="rollup"]').click();
        expect(await preview()).toMatchObject({
          blocks: { hidden: true },
          rollup: { hidden: false },
        });
        await page.locator('.cd-btn[data-layout="blocks"]').click();
        expect((await preview()).blocks.hidden).toBe(false);
        for (const behind of ["black", "white", "transparent", "camera"]) {
          await page.locator(`.cd-btn[data-behind="${behind}"]`).click();
          const shown = await preview();
          expect([shown.behind, shown.pressed.at(-1)]).toEqual([behind, behind]);
        }
        const before = (await preview()).fontSize;
        await page.locator("#cd-size").fill("80");
        const bigger = await preview();
        expect(bigger.size).toBe("80");
        expect(bigger.fontSize).not.toBe(before);
        expect(bigger.fontSize).toContain("80px");
        await page.locator("#cd-src").check();
        expect((await preview()).blocks.cls).toContain("show-both");
        await page.locator("#cd-src").uncheck();
        expect((await preview()).blocks.cls).toContain("show-target");
        // The 1920 px screen is scaled into the frame, not cut off.
        const frame = await boxOf(page, ".capdemo");
        const stage = await boxOf(page, ".capdemo-stage");
        expect(Math.abs((stage?.width ?? 0) - (frame?.width ?? 1))).toBeLessThan(2);
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the board's play button pauses everything from the moment the page loads, and is remembered after a reload and on other pages", async ({
      expect,
    }) => {
      const d = DICTS.en;
      const tab = await home(site(), "en");
      const { page } = tab;
      const url = site().servers.hosted.url;
      const textPage = `${url}${pathOf("hosted", "en", "install")}`;
      const pausedThere = (): Promise<boolean> =>
        inPage(page, "() => document.documentElement.classList.contains('motion-paused')");
      try {
        // Right after load, the board out of view and locked: the button works, by keyboard too.
        expect(await motion(page)).toMatchObject({
          paused: false,
          stored: null,
          label: d.motionPause,
        });
        expect(await board(page)).toMatchObject({ intro: true, locked: true, disabled: false });
        await pressPlay(page);
        expect(await motion(page)).toMatchObject({
          paused: true,
          stored: "paused",
          label: d.motionPlay,
        });
        // Nothing moves, wherever the visitor looks: the headline, the board, the prayer screen
        // and the dots (which draw once more for a scroll).
        for (const where of [".a1-stage", "#board", "#prayer-demo"]) {
          await reveal(page, where);
          await page.clock.runFor(100);
          const still = { ...(await motion(page)), board: await board(page) };
          await page.clock.runFor(7000);
          expect({ ...(await motion(page)), board: await board(page) }, where).toEqual(still);
        }
        // The board, scrolled to, started on its still picture without the intro, with Play.
        const first = await board(page);
        expect(first).toMatchObject({ locked: false, introMark: false, label: d.motionPlay });
        expect(first.blocks.some((b) => b.verse && b.trSettled)).toBe(true);

        // Played again: the board plays on from where it was held, and everything else moves.
        await reveal(page, "#board");
        await page.locator(".yt-play").click();
        expect(await motion(page)).toMatchObject({
          paused: false,
          stored: "playing",
          label: d.motionPause,
        });
        await page.clock.runFor(1000);
        expect((await board(page)).time > first.time).toBe(true);
        for (const [where, ms, moved] of [
          [".a1-stage", 7000, ["head", "dots"]],
          ["#prayer-demo", 3300, ["card", "dots"]],
        ] as const) {
          await reveal(page, where);
          await page.clock.runFor(100);
          const before = await motion(page);
          await page.clock.runFor(ms);
          const after = await motion(page);
          for (const k of moved) expect(after[k], `${where} ${k}`).not.toBe(before[k]);
        }

        // Paused again, it stays paused after a reload: the button says Play at once, and the
        // board shows its still picture (no intro).
        await reveal(page, "#board");
        await page.locator(".yt-play").click();
        await tab.goto(`${url}/`);
        expect(await motion(page)).toMatchObject({
          paused: true,
          stored: "paused",
          label: d.motionPlay,
        });
        await reveal(page, "#board");
        await advanceUntil(page, `!${LOCKED}`, "the board starts");
        const still = await board(page);
        expect(still).toMatchObject({ introMark: false, label: d.motionPlay });
        expect(still.blocks.some((b) => b.verse && b.trSettled)).toBe(true);
        await page.clock.runFor(3000);
        expect(await board(page)).toEqual(still);
        // and on the other pages
        await tab.goto(textPage);
        expect(await pausedThere()).toBe(true);

        // Played before the board is in view: everything moves, the intro runs and the Friday
        // plays; the other pages move again too.
        await tab.goto(`${url}/`);
        await pressPlay(page);
        expect(await motion(page)).toMatchObject({
          paused: false,
          stored: "playing",
          label: d.motionPause,
        });
        await landIntro(page);
        expect(await board(page)).toMatchObject({ chapter: d.m_athan, label: d.motionPause });
        const started = (await board(page)).time;
        await page.clock.runFor(1000);
        expect((await board(page)).time > started).toBe(true);
        await tab.goto(textPage);
        expect(await pausedThere()).toBe(false);
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("paused during the board's intro, the intro lands and the board stays still, with Play", async ({
      expect,
    }) => {
      const d = DICTS.nl;
      const tab = await home(site(), "nl");
      const { page } = tab;
      try {
        await reveal(page, "#board");
        await advanceUntil(
          page,
          "document.querySelector('.intro-mark') !== null",
          "the intro starts",
          {
            realMs: 20,
          },
        );
        await page.clock.runFor(500);
        await page.locator(".yt-play").click();
        expect(await motion(page)).toMatchObject({
          paused: true,
          stored: "paused",
          label: d.motionPlay,
        });
        expect((await board(page)).locked).toBe(true);
        await advanceUntil(page, `!${LOCKED}`, "the board starts after its intro", {
          realMs: 60,
          max: 20_000,
        });
        const still = await board(page);
        expect(still).toMatchObject({
          intro: false,
          introMark: false,
          label: d.motionPlay,
          chapter: d.m_khutbah,
        });
        expect(still.blocks.some((b) => b.verse && b.trSettled)).toBe(true);
        await page.clock.runFor(3000);
        expect(await board(page)).toEqual(still);
        // Play is the board's now: the Friday plays on, and the page moves.
        await page.locator(".yt-play").click();
        await page.clock.runFor(1000);
        expect((await board(page)).time > still.time).toBe(true);
        expect(await motion(page)).toMatchObject({ paused: false, stored: "playing" });
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("with reduced motion, every demo is a still picture from the start", async ({
      expect,
    }) => {
      const d = DICTS.en;
      for (const mobile of [false, true]) {
        const tab = await home(site(), "en", { reducedMotion: true, mobile });
        const { page } = tab;
        const picture = (): Promise<{
          headLit: boolean;
          arLit: boolean;
          verseLit: boolean;
          verseSettled: boolean;
          prayer: string;
          running: number;
        }> =>
          inPage(
            page,
            `() => {
              const all = (s, cls) => [...document.querySelectorAll(s)].every((w) => w.classList.contains(cls));
              return {
                headLit: all(".a1-h .w", "on"),
                arLit: all(".a1-ar .aw", "on"),
                verseLit: all("#verse-demo .vd-ar .w", "lit"),
                verseSettled: document.querySelector("#verse-demo .vd-tr").classList.contains("on"),
                prayer: document.querySelector("#prayer-demo .tj-screen").dataset.card,
                running: document.getAnimations().filter((a) => a.playState === "running").length,
              };
            }`,
          );
        try {
          // The board shows the verse, fully said, at once: no intro, nothing playing.
          const start = await board(page);
          expect(start).toMatchObject({
            intro: false,
            introMark: false,
            locked: false,
            label: d.motionPlay,
            chapter: d.m_khutbah,
          });
          expect(start.blocks.some((b) => b.verse && b.trSettled && b.arOn === b.arWords)).toBe(
            true,
          );
          const first = await picture();
          expect(first).toEqual({
            headLit: true,
            arLit: true,
            verseLit: true,
            verseSettled: true,
            prayer: "iqama",
            running: 0,
          });
          const head = await textOf(page, ".a1-h");
          await reveal(page, "#board");
          await reveal(page, "#prayer-demo");
          await page.clock.runFor(15_000);
          expect(await picture()).toEqual(first);
          expect(await textOf(page, ".a1-h")).toBe(head);
          expect((await board(page)).time).toBe(start.time);
          expect(await inPage(page, "() => document.querySelector('.intro-mark') === null")).toBe(
            true,
          );
          // A text page is just as still.
          await tab.goto(`${site().servers.hosted.url}${pathOf("hosted", "en", "install")}`);
          expect(
            await inPage(
              page,
              "() => document.getAnimations().filter((a) => a.playState === 'running').length",
            ),
          ).toBe(0);
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });
  });
}
