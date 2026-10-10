// The website's script (site/client) in a real browser: the pages are built into a temporary
// directory, served with the real routes and headers (src/server/site.ts, strict CSP), and driven
// in headless Chrome. Skipped when Chrome is not installed (or with SITE_BROWSER_TESTS=0).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { type Browser, type BrowserContext, chromium, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSite } from "../../scripts/build-site.js";
import { MOTION_KEY, SITE_LANG_KEY } from "../../site/client/storage-keys.js";
import { SELF_HOST_COMMANDS } from "../../site/content/links.js";
import { DICTS } from "../../site/content/strings.js";
import { applyHtmlHeaders } from "../../src/server/security.js";
import { registerSite } from "../../src/server/site.js";

// The code passed to page.evaluate runs in the browser. The test project has no DOM types, so
// these are the few DOM names it uses (declared in this module only).
interface El {
  className: string;
  textContent: string | null;
  hidden: boolean;
  disabled: boolean;
  ariaPressed: string | null;
  dataset: Record<string, string | undefined>;
  classList: { contains(name: string): boolean };
  getAttribute(name: string): string | null;
  getBoundingClientRect(): { top: number; left: number; width: number; height: number };
  contains(other: El | null): boolean;
}
declare const document: {
  activeElement: El | null;
  fonts: { ready: Promise<unknown> };
  getElementById(id: string): El | null;
  querySelector(selector: string): El | null;
  querySelectorAll(selector: string): { length: number } & Iterable<El>;
  elementFromPoint(x: number, y: number): El | null;
  documentElement: El & { scrollWidth: number; clientWidth: number };
  addEventListener(
    type: string,
    listener: (e: { violatedDirective: string; blockedURI: string }) => void,
  ): void;
};
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
declare const navigator: { clipboard: { readText(): Promise<string> } };
declare function getComputedStyle(el: El | null): { opacity: string; outlineStyle: string };

async function launch(): Promise<Browser | null> {
  if (process.env.SITE_BROWSER_TESTS === "0") return null;
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return null;
  }
}

const browser = await launch();

describe.skipIf(browser === null)("site: in a browser", () => {
  let dir = "";
  let app: FastifyInstance;
  let base = "";

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "site-browser-"));
    await buildSite({ outDir: join(dir, "site") });
    const server = Fastify();
    app = server;
    await registerSite(server, { mode: "hosted", publicDir: dir, applyHtmlHeaders });
    server.setNotFoundHandler(async (req, reply) => {
      if (await server.siteNotFound(req, reply)) return reply;
      return reply.code(404).send("Not found\n");
    });
    base = await server.listen({ port: 0, host: "127.0.0.1" });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    await app?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  interface Opened {
    context: BrowserContext;
    page: Page;
    problems: string[];
  }

  async function open(
    path: string,
    o: { reduce?: boolean; storage?: Record<string, string> } = {},
  ): Promise<Opened> {
    if (browser === null) throw new Error("no browser");
    const context = await browser.newContext({
      viewport: { width: 1280, height: 860 },
      reducedMotion: o.reduce ? "reduce" : "no-preference",
    });
    if (o.storage) {
      await context.addInitScript((s: Record<string, string>) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      }, o.storage);
    }
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") problems.push(m.text());
    });
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith(base)) problems.push(`request elsewhere: ${r.url()}`);
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) =>
        console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`),
      );
    });
    await page.goto(base + path);
    await page.evaluate(() => document.fonts.ready);
    return { context, page, problems };
  }

  const state = (page: Page) =>
    page.evaluate(() => ({
      card: document.getElementById("board")?.dataset.card ?? null,
      time: document.querySelector(".yt-time")?.textContent ?? "",
      label: document.querySelector(".yt-play")?.getAttribute("aria-label") ?? "",
      locked: document.getElementById("scrubber")?.classList.contains("locked") ?? true,
    }));

  async function startedStill(page: Page): Promise<void> {
    await page.waitForFunction(
      () => !document.getElementById("scrubber")?.classList.contains("locked"),
    );
  }

  it("loads cleanly in every language and hands the page's language to the app", async () => {
    for (const [path, lang] of [
      ["/", "en"],
      ["/nl", "nl"],
      ["/ar", "ar"],
    ] as const) {
      const { context, page, problems } = await open(path);
      expect(await page.evaluate((k) => localStorage.getItem(k), SITE_LANG_KEY)).toBe(lang);
      // The JSON-LD data block is in the page and the strict CSP reports nothing about it.
      const ld = await page.evaluate(
        () => document.querySelector('script[type="application/ld+json"]')?.textContent ?? "",
      );
      expect((JSON.parse(ld) as { "@graph": unknown[] })["@graph"]).toHaveLength(
        lang === "en" ? 3 : 2,
      );
      await page.waitForTimeout(300);
      expect(problems).toEqual([]);
      await context.close();
    }
  });

  it("stops on the final hold with End, instead of looping back to the Athan", async () => {
    const { context, page, problems } = await open("/", { reduce: true });
    await startedStill(page);
    await page.click(".yt-play");
    expect((await state(page)).label).toBe(DICTS.en.motionPause);
    await page.focus(".yt-track");
    await page.keyboard.press("End");
    const end = await state(page);
    expect(end).toMatchObject({ card: "salah", time: "13:30:00", label: DICTS.en.motionPlay });
    // End stops the simulation only: the rest of the page is not paused.
    expect(
      await page.evaluate(() => document.documentElement.classList.contains("motion-paused")),
    ).toBe(false);
    await page.waitForTimeout(900);
    expect(await state(page)).toEqual(end);
    // Play from the end starts the Friday again.
    await page.click(".yt-play");
    expect((await state(page)).time.startsWith("12:45:0")).toBe(true);
    await page.waitForFunction(() => document.getElementById("board")?.dataset.card === "athan");
    expect(problems).toEqual([]);
    await context.close();
  });

  it("shows a seek at once: a prayer moment never lingers over the captions", async () => {
    // Animations paused: the board starts at once, without the logo intro.
    const { context, page } = await open("/", { storage: { [MOTION_KEY]: "paused" } });
    await page.locator("#scrubber").scrollIntoViewIfNeeded();
    await startedStill(page);
    const bars = await page.$$eval(".yt-bar", (els) =>
      els.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left, w: r.width, y: r.top + r.height / 2 };
      }),
    );
    const [, khutbah, iqama] = bars;
    if (khutbah === undefined || iqama === undefined) throw new Error("no chapters");
    await page.mouse.move(iqama.x + iqama.w * 0.8, iqama.y);
    await page.mouse.down();
    expect((await state(page)).card).toBe("iqama");
    await page.mouse.move(khutbah.x + khutbah.w * 0.5, khutbah.y);
    const during = await page.evaluate(() => ({
      jump: document.getElementById("board")?.classList.contains("jump"),
      card: document.getElementById("board")?.dataset.card,
      iqama: getComputedStyle(document.querySelector(".bcard.iqama")).opacity,
      caps: getComputedStyle(document.querySelector("#board .caps")).opacity,
    }));
    expect(during).toEqual({ jump: true, card: "", iqama: "0", caps: "1" });
    await page.mouse.up();
    await page.waitForFunction(() => !document.getElementById("board")?.classList.contains("jump"));
    await context.close();
  });

  it("pauses everything with the board's play button from the moment the page loads, and remembers it", async () => {
    const { context, page, problems } = await open("/nl");
    const state = () =>
      page.evaluate(() => ({
        root: document.documentElement.classList.contains("motion-paused"),
        label: document.querySelector(".yt-play")?.getAttribute("aria-label"),
        disabled: document.querySelector(".yt-play")?.disabled,
        locked: document.getElementById("scrubber")?.classList.contains("locked"),
      }));
    const stored = () => page.evaluate((k: string) => localStorage.getItem(k), MOTION_KEY);
    /** Presses the button with the keyboard, without scrolling the board into view. */
    const press = async (): Promise<void> => {
      await page.evaluate("document.querySelector('.yt-play').focus({ preventScroll: true })");
      await page.keyboard.press("Enter");
    };
    // Right after load, the board out of view and locked: the button already works.
    expect(await state()).toEqual({
      root: false,
      label: DICTS.nl.motionPause,
      disabled: false,
      locked: true,
    });
    await press();
    expect(await state()).toEqual({
      root: true,
      label: DICTS.nl.motionPlay,
      disabled: false,
      locked: true,
    });
    expect(await stored()).toBe("paused");
    // Scrolled to, the board starts on its still picture, without the intro, with Play.
    await page.locator("#scrubber").scrollIntoViewIfNeeded();
    await startedStill(page);
    expect(await state()).toMatchObject({ root: true, label: DICTS.nl.motionPlay });
    expect(await page.evaluate(() => document.querySelector(".intro-mark") === null)).toBe(true);

    // After a reload (from the top): paused at once, and the button says Play. Played before the
    // board is in view, the intro runs and the Friday plays.
    await page.evaluate("window.scrollTo(0, 0)");
    await page.reload();
    expect(await state()).toEqual({
      root: true,
      label: DICTS.nl.motionPlay,
      disabled: false,
      locked: true,
    });
    await press();
    expect(await state()).toMatchObject({ root: false, label: DICTS.nl.motionPause, locked: true });
    expect(await stored()).toBe("playing");
    await page.locator("#scrubber").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".intro-mark") !== null);
    await startedStill(page);
    expect(await state()).toEqual({
      root: false,
      label: DICTS.nl.motionPause,
      disabled: false,
      locked: false,
    });
    expect(problems).toEqual([]);
    await context.close();
  });

  it("copies the self-host commands, one per line", async () => {
    const { context, page } = await open("/");
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
    await page.click("[data-copy]");
    await page.waitForFunction(
      (copied) => document.querySelector("[data-copy]")?.textContent === copied,
      DICTS.en.copied,
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      SELF_HOST_COMMANDS.join("\n"),
    );
    await context.close();
  });

  it("dresses the demo screen in a preset's own layout", async () => {
    const { context, page } = await open("/", { reduce: true });
    await page.click('.cd-chip[data-preset="lower-third"]');
    const look = await page.evaluate(() => ({
      pressed: document.querySelector('.cd-chip[data-preset="lower-third"]')?.ariaPressed,
      blocks: document.querySelector(".capdemo .blk-root")?.hidden,
      rollup: document.querySelector(".capdemo .cap-root")?.hidden,
      arabic: document.querySelector(".capdemo .cap-source")?.hidden,
    }));
    expect(look).toEqual({ pressed: "true", blocks: true, rollup: false, arabic: false });
    await context.close();
  });

  it("loads every text page cleanly, right to left on the Arabic site", async () => {
    const pages = [
      "/ar/how-it-works",
      "/ar/show-on-a-screen",
      "/ar/security",
      "/ar/self-host",
      "/ar/install",
      "/ar/network",
      "/ar/docker",
      "/ar/commands",
      "/nl/install",
      "/commands",
    ];
    for (const path of pages) {
      const { context, page, problems } = await open(path);
      const shape = await page.evaluate(() => ({
        dir: document.documentElement.getAttribute("dir"),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        copies: document.querySelectorAll("button[data-copy]").length,
      }));
      expect([path, shape.dir, shape.overflow]).toEqual([
        path,
        path.startsWith("/ar") ? "rtl" : "ltr",
        0,
      ]);
      expect(problems).toEqual([]);
      await context.close();
    }
  });

  it("serves the 404 page in the address's language", async () => {
    const { context, page } = await open("/nl/no/such/page");
    expect(await page.evaluate(() => document.querySelector(".doc-h1")?.textContent)).toBe(
      "Deze pagina bestaat niet.",
    );
    await context.close();
  });

  it("opens the phone menu, and closes it with Escape", async () => {
    if (browser === null) throw new Error("no browser");
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${base}/nl/install`);
    await page.click(".menu summary");
    const open = await page.evaluate(() => ({
      open: document.querySelector("details.menu")?.getAttribute("open"),
      links: document.querySelectorAll(".menu-panel a").length,
      // the panel lies over the page (the stepper and the heading under it stay below)
      onTop: [...document.querySelectorAll(".menu-panel a")].every((a) => {
        const r = a.getBoundingClientRect();
        return a.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      }),
    }));
    expect(open).toEqual({ open: "", links: 5, onTop: true });
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(() => document.querySelector("details.menu")?.getAttribute("open")),
    ).toBeNull();
    await context.close();
  });

  it("starts the keyboard at the skip link and shows where the focus is", async () => {
    const { context, page } = await open("/ar", { reduce: true });
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => ({
      cls: document.activeElement?.className,
      top: document.activeElement?.getBoundingClientRect().top ?? -1,
    }));
    expect(first.cls).toBe("skip");
    expect(first.top).toBeGreaterThanOrEqual(0);
    await startedStill(page);
    await page.focus(".yt-track");
    await page.keyboard.press("Home");
    await page.keyboard.press("PageUp");
    expect((await state(page)).time).toBe("12:50:00");
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(ring).not.toBe("none");
    await context.close();
  });
});
