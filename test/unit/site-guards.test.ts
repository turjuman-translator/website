// The website's pure parts at their edges: what the page build refuses (unknown pages, links and
// templates, inline styles and scripts, broken CSS), the timeline and the style demo without what
// they need, and a theme whose background its layout does not have.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type DemoState,
  demoOptions,
  demoPreset,
  presetShowsSource,
} from "../../site/client/caption-theme.js";
import {
  buildTimeline,
  chapterAt,
  clockAt,
  keySeek,
  momentCue,
  scrubPercent,
} from "../../site/client/timeline.js";
import { helpers } from "../../site/content/docs/make.js";
import { KHUTBAH } from "../../site/content/khutbah.js";
import { pageById } from "../../site/content/pages.js";
import { pagerHtml } from "../../site/render/doc.js";
import { mergeValues } from "../../site/render/html.js";
import { type PageAssets, renderPage, resolveTarget, targetHref } from "../../site/render/page.js";
import { scopeCss } from "../../site/render/scope-css.js";
import { BUILTIN_PRESETS, DEFAULT_PRESET_ID } from "../../src/shared/theme.js";
import type { ThemePreset } from "../../src/shared/theme-vars.js";

const layout = readFileSync(new URL("../../site/layout.html", import.meta.url), "utf8");
const assets: PageAssets = {
  scripts: { home: "/a/home.js", page: "/a/page.js" },
  style: "/a/site.css",
  icon: "/a/icon.svg",
  iconPng: "/a/favicon.png",
  touchIcon: "/a/touch.png",
  og: { en: "/a/og-en.png", nl: "/a/og-nl.png", ar: "/a/og-ar.png" },
  fonts: [],
};
const security = pageById("security");
const here = { page: security, lang: "nl", mode: "hosted" } as const;

describe("site: what the page build refuses", () => {
  it("a page that does not exist, by id or from a link", () => {
    expect(() => pageById("blog")).toThrow('no site page "blog"');
    expect(() => targetHref({ page: "blog" }, here)).toThrow(
      'site: a link points to the unknown page "blog"',
    );
    expect(() => resolveTarget("page:blog#top", here)).toThrow(/unknown page "blog"/);
  });

  it("a place on the page itself is just its #hash", () => {
    expect(targetHref({ page: "security" }, here)).toBe("#top");
    expect(targetHref({ page: "security", hash: "report" }, here)).toBe("#report");
    expect(resolveTarget("page:security#report", here)).toBe("#report");
    expect(resolveTarget("page:install#keys", here)).toBe("/nl/install#keys");
  });

  it("a link target it does not know (no plain http, no other schemes)", () => {
    expect(resolveTarget("https://soniox.com", here)).toBe("https://soniox.com");
    for (const target of ["http://example.com", "mailto:imam@example.com", "install"]) {
      expect(() => resolveTarget(target, here)).toThrow(`site: unknown link target "${target}"`);
    }
  });

  it("a make helper the text pages name but the list does not have", () => {
    expect(helpers(["make help"]).map((h) => h.cmd)).toEqual(["make help"]);
    expect(() => helpers(["make deploy"])).toThrow('no make helper "make deploy"');
  });

  it("a word that is also a fragment", () => {
    expect(mergeValues({ title: "A & B" }, { body: "<p>" })).toEqual({
      title: "A &amp; B",
      body: "<p>",
    });
    expect(() => mergeValues({ title: "A" }, { title: "<b>A</b>" })).toThrow(
      'site: "title" is both a word and a fragment',
    );
  });

  it("a page without its template, or with a placeholder left in it", () => {
    expect(() => renderPage({ layout, pages: {} }, security, "en", assets)).toThrow(
      "site: no template site/pages/doc.html",
    );
    expect(() =>
      renderPage({ layout, pages: { doc: "<h1>{{ docH1 }}</h1>" } }, security, "en", assets),
    ).toThrow("site: a placeholder is left unfilled");
  });

  it("an inline script or style anywhere in a page (the CSP allows neither)", () => {
    for (const body of [
      "<h1>{{docH1}}</h1><script>alert(1)</script>",
      '<h1 style="color: red">{{docH1}}</h1>',
      "<style>h1 { color: red }</style><h1>{{docH1}}</h1>",
    ]) {
      expect(() => renderPage({ layout, pages: { doc: body } }, security, "en", assets)).toThrow(
        "site page has an inline script or style (CSP)",
      );
    }
    expect(
      renderPage({ layout, pages: { doc: "<h1>{{docH1}}</h1>" } }, security, "en", assets),
    ).toContain('<script type="module" src="/a/page.js"></script>');
  });

  it("caption CSS it cannot read", () => {
    expect(() => scopeCss('.cap::after { content: "} ; }', ".s")).toThrow(
      "unterminated string in CSS",
    );
    expect(() => scopeCss(".cap { color: red; ", ".s")).toThrow("unbalanced braces in CSS");
  });

  it("no previous and next links on a page off the self-host path", () => {
    expect(pagerHtml({ lang: "en", pageId: "security", resolve: (t) => t, languages: [] })).toBe(
      "",
    );
  });
});

describe("site: the simulation without what it needs", () => {
  it("fails loudly without a prayer moment the board needs", () => {
    const tl = buildTimeline([{ moment: "athan", dur: 5000 }, ...KHUTBAH], {
      maxBlocks: 3,
      tail: 400,
    });
    expect(momentCue(tl.cues, "athan").s).toBe(140);
    expect(() => momentCue(tl.cues, "iqama")).toThrow("the simulation has no iqama");
  });

  it("reads the first chapter before the simulation starts, and nothing without chapters", () => {
    const chs = [{ t0: 0, t1: 1000, from: 3600, to: 3660 }];
    expect(chapterAt(chs, -50)).toBe(0);
    expect(clockAt(chs, -50)).toBe("01:00:00");
    expect(chapterAt([], 500)).toBe(0);
    expect(clockAt([], 500)).toBe("");
    expect(keySeek("PageDown", 500, [], 1000)).toEqual({ t: 0, pause: false });
    expect(scrubPercent(500, 0)).toBe(0);
  });
});

describe("site: the style demo's themes", () => {
  const st: DemoState = {
    preset: DEFAULT_PRESET_ID,
    layout: null,
    size: null,
    src: false,
    quran: true,
    behind: "camera",
  };
  const theme = (options: ThemePreset["options"]): ThemePreset => ({
    id: "custom",
    name: "Custom",
    description: "",
    vars: {},
    options,
  });

  it("gives a theme the background its own layout has", () => {
    expect(demoOptions(theme({ layout: "rollup", bg: "panel" }), st).bg).toBe("band");
    expect(demoOptions(theme({ layout: "blocks", bg: "band" }), st).bg).toBe("panel");
    expect(demoOptions(theme({ layout: "blocks", bg: "shadow" }), st).bg).toBe("none");
    expect(demoOptions(theme({ layout: "blocks", bg: "none" }), st).bg).toBe("none");
  });

  it("finds a built-in theme by id, else the first, and needs at least one", () => {
    expect(demoPreset("cinema").id).toBe("cinema");
    expect(demoPreset("retired")).toBe(BUILTIN_PRESETS[0]);
    expect(() => demoPreset("cinema", [])).toThrow("the style demo has no presets");
  });

  it("shows the Arabic line only for a theme that shows both", () => {
    expect(presetShowsSource(demoPreset("lower-third"))).toBe(true);
    expect(presetShowsSource(demoPreset("cinema"))).toBe(false);
    expect(presetShowsSource(theme({ layout: "blocks", bg: "panel" }))).toBe(false);
  });
});
