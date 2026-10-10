import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captionLanguages } from "../../scripts/build-site.js";
import { SECURITY_REPORT } from "../../site/content/docs/shared.js";
import { SITE_LANGS } from "../../site/content/khutbah.js";
import {
  APP_PATHS,
  DOCS_URL,
  GITHUB_URL,
  LICENSE_URL,
  SELF_HOST_COMMANDS,
  SELF_HOST_REPO,
  SITE_MODES,
} from "../../site/content/links.js";
import { checkPages, PAGES, pageById, pagePath, type SitePage } from "../../site/content/pages.js";
import { DICTS, SCREEN_WORDS, type SiteKey } from "../../site/content/strings.js";
import {
  escapeHtml,
  fillTemplate,
  navHtml,
  ORIGIN_TOKEN,
  type PageAssets,
  presetName,
  renderPage,
  targetHref,
} from "../../site/render/page.js";
import { BUILTIN_PRESETS } from "../../src/shared/theme.js";
import { type MsgKey, message } from "../../web/shared/app-i18n.js";
import { eventLabel } from "../../web/shared/i18n.js";

const read = (file: string): string =>
  readFileSync(new URL(`../../site/${file}`, import.meta.url), "utf8");
const templates = {
  layout: read("layout.html"),
  pages: Object.fromEntries(
    [...new Set(PAGES.map((p) => p.template ?? p.id))].map((n) => [n, read(`pages/${n}.html`)]),
  ),
};
const data = { languages: await captionLanguages() };
const HOME = pageById("home");
const homePath = (mode: "hosted" | "local", lang: "en" | "nl" | "ar"): string =>
  pagePath(mode, lang, "");
const assets: PageAssets = {
  scripts: { home: "/site-assets/home-ABC.js", page: "/site-assets/page-ABC.js" },
  style: "/site-assets/site-ABC.css",
  icon: "/site-assets/icon-abc.svg",
  iconPng: "/site-assets/favicon-abc.png",
  touchIcon: "/site-assets/touch-icon-abc.png",
  og: {
    en: "/site-assets/og-en-abc.png",
    nl: "/site-assets/og-nl-abc.png",
    ar: "/site-assets/og-ar-abc.png",
  },
  fonts: ["/site-assets/readex-latin.woff2", "/site-assets/naskh-500.woff2"],
};

const hrefs = (html: string, cls: string): string[] =>
  [...html.matchAll(new RegExp(`<a class="${cls}" href="([^"]+)"`, "g"))].map((m) => m[1] ?? "");

describe("site: the pages", () => {
  for (const lang of SITE_LANGS) {
    describe(lang, () => {
      const html = renderPage(templates, HOME, lang, assets, "hosted", data);
      const d = DICTS[lang];

      it("declares its language, direction, title, description and icons", () => {
        expect(html).toContain(`<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`);
        expect(html).toContain(`<title>${escapeHtml(d.title)}</title>`);
        expect(html).toContain(`<meta name="description" content="${escapeHtml(d.desc)}">`);
        expect(html).toContain('<meta name="theme-color" content="#ffffff">');
        expect(html).toContain(`<link rel="icon" href="${assets.icon}" type="image/svg+xml">`);
        // Google Search shows a PNG favicon, not an SVG one.
        expect(html).toContain(
          `<link rel="icon" href="${assets.iconPng}" type="image/png" sizes="192x192">`,
        );
        expect(html).toContain(`<link rel="apple-touch-icon" href="${assets.touchIcon}">`);
        expect(html).not.toContain("<!--");
      });

      it("links its language versions with absolute URLs (the server fills in the origin)", () => {
        for (const [l, href] of [
          ["en", "/"],
          ["nl", "/nl"],
          ["ar", "/ar"],
          ["x-default", "/"],
        ]) {
          expect(html).toContain(
            `<link rel="alternate" hreflang="${l}" href="${ORIGIN_TOKEN}${href}">`,
          );
        }
        expect(html).toContain(
          `<link rel="canonical" href="${ORIGIN_TOKEN}${homePath("hosted", lang)}">`,
        );
        expect(html.match(/aria-current="page"/g)).toHaveLength(1);
        expect(html).toMatch(new RegExp(`data-lang="${lang}" aria-current="page"`));
        expect(html).not.toContain("noindex");
      });

      it("has Open Graph tags with its own picture", () => {
        expect(html).toContain(`<meta property="og:title" content="${escapeHtml(d.title)}">`);
        expect(html).toContain(`<meta property="og:description" content="${escapeHtml(d.desc)}">`);
        expect(html).toContain(
          `<meta property="og:image" content="${ORIGIN_TOKEN}${assets.og[lang]}">`,
        );
        expect(html).toContain(
          `<meta property="og:url" content="${ORIGIN_TOKEN}${homePath("hosted", lang)}">`,
        );
      });

      it("loads only its own hashed assets (CSP: no inline script or style, no other site)", () => {
        expect(html).toContain(`<script type="module" src="${assets.scripts.home}"></script>`);
        expect(html).toContain('<body data-page="home">');
        expect(html).toContain(`<link rel="stylesheet" href="${assets.style}">`);
        // The one inline script is the JSON-LD data block, which is never run (site-seo.test.ts).
        expect(html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi)).toEqual([
          '<script type="application/ld+json">',
        ]);
        expect(html).not.toMatch(/<style\b/i);
        expect(html).not.toMatch(/\sstyle\s*=/i);
        // Every URL that is loaded is on this site; other sites are only linked to.
        for (const m of html.matchAll(/\s(src|href|content)="(https?:[^"]*)"/g)) {
          expect(m[1]).toBe("href");
          expect(m[2]).toMatch(/^https:\/\/github\.com\/turjuman-translator\//);
        }
        expect(html).not.toContain("{{");
      });

      it("preloads only the first screen's fonts", () => {
        const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)];
        expect(preloads.map((m) => m[1])).toEqual(assets.fonts);
        expect(html).toMatch(/as="font" type="font\/woff2" crossorigin>/);
      });

      it("points sign-up, log-in, the pages, GitHub and the licence where they belong", () => {
        const at = (slug: string): string => pagePath("hosted", lang, slug);
        expect(hrefs(html, "signin")).toEqual(["/login"]);
        expect(hrefs(html, "btn primary sm nav-start")).toEqual(["/signup"]);
        // the hero, the account card and the phone menu
        expect(hrefs(html, "btn primary")).toEqual(["/signup", "/signup", "/signup"]);
        expect(hrefs(html, "btn secondary")).toEqual([at("self-host")]);
        expect(html).toContain(`<a href="${at("how-it-works")}">${escapeHtml(d.nav1)}</a>`);
        expect(html).toContain(`<a class="more-link" href="${at("show-on-a-screen")}">`);
        expect(html).toContain(`<a class="more-link" href="${at("install")}">`);
        expect(html).toContain(`<a href="${at("security")}">${escapeHtml(d.f3)}</a>`);
        for (const url of [GITHUB_URL, SELF_HOST_REPO, LICENSE_URL, SECURITY_REPORT]) {
          expect(html).toContain(`href="${url}"`);
        }
        // the server fills in (or takes out) the operator's own links
        expect(html).toContain('<a href="__TJ_PRIVACY__" data-op="privacy">');
        expect(html).toContain('<a href="__TJ_CONTACT__" data-op="contact">');
        expect(html).toContain(escapeHtml(d.quranCredit));
      });

      it("shows the self-hosted edition's commands", () => {
        const block =
          /<pre class="code" id="commands" dir="ltr">(.*?)<\/pre>/.exec(html)?.[1] ?? "";
        const lines = [...block.matchAll(/<span class="ln">(.*?)<\/span><\/span>/g)].map(
          (m) => `${m[1]}</span>`,
        );
        // A long line wraps only between words or after a slash (<wbr>); the text is the same.
        expect(lines.map((l) => l.replace(/<[^>]+>/g, ""))).toEqual(
          SELF_HOST_COMMANDS.map(escapeHtml),
        );
        expect(lines[0]).toContain(
          '<span class="nb">https://</span><wbr><span class="nb">github.com/</span><wbr>',
        );
      });

      it("offers the app's built-in presets, named as the app names them", () => {
        const chips = [...html.matchAll(/data-preset="([^"]+)"[^>]*>([^<]+)</g)];
        expect(chips.map((m) => m[1])).toEqual(BUILTIN_PRESETS.map((p) => p.id));
        for (const [, id, name] of chips) {
          expect(name).toBe(escapeHtml(message(lang, `preset.${id}` as MsgKey)));
        }
      });

      it("shows the caption page's own prayer cards (title, subtitle) on the demo screens", () => {
        const cap = lang === "ar" ? "nl" : lang;
        // The demo screen speaks its captions' language, like the caption page.
        expect(html).toContain(`<span lang="${cap}">${SCREEN_WORDS[cap].hall}</span>`);
        for (const m of ["athan", "iqama", "salah"] as const) {
          const label = eventLabel(m, cap);
          expect(html).toContain(
            `<div class="card ${m}"><span class="c-ar" lang="ar">${label.ar}</span>` +
              `<span class="c-lat" lang="${cap}">${escapeHtml(label.title)}</span>`,
          );
          expect(html).toContain(`<span class="bc-lat">${escapeHtml(label.title)}</span>`);
          if (label.subtitle !== "") expect(html).toContain(escapeHtml(label.subtitle));
        }
      });

      it("carries the words the script switches between in data attributes", () => {
        // One play button: the board's, which pauses and plays everything that moves (disabled
        // until the script wires it, as the page's switch from the start).
        const play = (html.match(/<button[^>]* data-play="[^"]*"[^>]*>/g) ?? []).join("\n");
        expect(play).toBe(
          `<button type="button" class="yt-play" aria-label="${escapeHtml(d.motionPause)}" ` +
            `data-play="${escapeHtml(d.motionPlay)}" data-pause="${escapeHtml(d.motionPause)}" disabled>`,
        );
        for (const key of ["m_athan", "m_khutbah", "m_iqama", "m_salah"] as const) {
          expect(html).toContain(`data-name="${escapeHtml(d[key])}"`);
        }
      });
    });
  }

  describe("the local preview (/site)", () => {
    for (const lang of SITE_LANGS) {
      const html = renderPage(templates, HOME, lang, assets, "local", data);

      it(`${lang}: stays under /site and starts in the builder`, () => {
        const langLinks = [...html.matchAll(/<a href="([^"]+)" hreflang="(\w+)" lang=/g)].map(
          (m) => [m[2], m[1]],
        );
        expect(langLinks).toEqual([
          ["en", "/site"],
          ["nl", "/site/nl"],
          ["ar", "/site/ar"],
        ]);
        expect(html).toContain(
          `<link rel="alternate" hreflang="nl" href="${ORIGIN_TOKEN}/site/nl">`,
        );
        expect(hrefs(html, "signin")).toEqual(["/login"]);
        expect(hrefs(html, "btn primary")).toEqual(["/app/new", "/app/new", "/app/new"]);
        expect(html).not.toContain('href="/signup"');
        expect(html).toContain('<meta name="robots" content="noindex">');
        expect(html).toContain(`<a href="${pagePath("local", lang, "install")}">`);
        // a local server has no operator links
        expect(html).not.toContain("data-op=");
      });
    }

    it("has a path for every page and both app links in each mode", () => {
      for (const mode of SITE_MODES) expect(APP_PATHS[mode].login).toBe("/login");
      expect(APP_PATHS.hosted.start).toBe("/signup");
      expect(APP_PATHS.local.start).toBe("/app/new");
    });
  });

  describe("more pages", () => {
    const guide: SitePage = { id: "guide", slug: "self-host-guide", script: "page" };
    const withGuide = {
      ...templates,
      pages: { ...templates.pages, guide: '<section class="wrap"><h1>{{nav2}}</h1></section>' },
    };

    it("live under the same English slug in every language, and under /site locally", () => {
      expect(pagePath("hosted", "en", "self-host")).toBe("/self-host");
      expect(pagePath("hosted", "nl", "self-host")).toBe("/nl/self-host");
      expect(pagePath("hosted", "ar", "self-host")).toBe("/ar/self-host");
      expect(pagePath("local", "en", "self-host")).toBe("/site/self-host");
      expect(pagePath("local", "ar", "self-host")).toBe("/site/ar/self-host");
      expect(pagePath("hosted", "en", "")).toBe("/");
      expect(pagePath("hosted", "nl", "")).toBe("/nl");
      expect(pagePath("local", "en", "")).toBe("/site");
      expect(pagePath("local", "nl", "")).toBe("/site/nl");
    });

    for (const mode of SITE_MODES) {
      for (const lang of SITE_LANGS) {
        it(`${mode} ${lang}: share the header and footer, and the language switch stays on the page`, () => {
          const html = renderPage(withGuide, guide, lang, assets, mode);
          const here = (l: (typeof SITE_LANGS)[number]): string => pagePath(mode, l, guide.slug);
          const home = pagePath(mode, lang, "");
          const switches = [...html.matchAll(/<a href="([^"]+)" hreflang="(\w+)" lang=/g)];
          expect(switches.map((m) => [m[2], m[1]])).toEqual(SITE_LANGS.map((l) => [l, here(l)]));
          for (const l of SITE_LANGS) {
            expect(html).toContain(
              `<link rel="alternate" hreflang="${l}" href="${ORIGIN_TOKEN}${here(l)}">`,
            );
          }
          expect(html).toContain(`<link rel="canonical" href="${ORIGIN_TOKEN}${here(lang)}">`);
          expect(html).toContain(`<script type="module" src="${assets.scripts.page}"></script>`);
          expect(html).toContain('<body data-page="guide">');
          expect(html).toContain(`<h1>${escapeHtml(DICTS[lang].nav2)}</h1>`);
          // The wordmark and the home page's sections are links back to the home page.
          const brand = lang === "ar" ? "ترجمان" : "Turjuman";
          expect(html).toContain(`<a class="wm-link" href="${home}" aria-label="${brand}">`);
          expect(html).toContain(
            `<a href="${pagePath(mode, lang, "how-it-works")}">${escapeHtml(DICTS[lang].nav1)}</a>`,
          );
          expect(html).toContain(`<a class="signin" href="${APP_PATHS[mode].login}">`);
        });
      }
    }

    it("mark the page you are on in the nav", () => {
      const here = { page: guide, lang: "nl" as const, mode: "hosted" as const };
      const nav = navHtml(
        [
          { text: "nav2", to: { page: "guide" } },
          { text: "nav1", to: { page: "home", hash: "how" } },
        ],
        here,
      );
      expect(nav).toBe(
        `<a href="#top" aria-current="page">${DICTS.nl.nav2}</a><a href="/nl#how">${DICTS.nl.nav1}</a>`,
      );
      expect(targetHref({ page: "home" }, here)).toBe("/nl");
      expect(targetHref({ app: "start" }, { ...here, mode: "local" })).toBe("/app/new");
    });

    it("never take a slug that could be a language code, or a malformed or repeated one", () => {
      expect(() => checkPages(PAGES)).not.toThrow();
      const page = (slug: string, id = slug): SitePage => ({ id, slug, script: "page" });
      expect(() => checkPages([page("nl")])).toThrow(/4\+ characters/);
      expect(() => checkPages([page("fil")])).toThrow();
      expect(() => checkPages([page("Self-Host", "a")])).toThrow();
      expect(() => checkPages([page("self/host", "a")])).toThrow();
      expect(() => checkPages([page("self-host", "a"), page("self-host", "b")])).toThrow(
        /duplicate/,
      );
    });
  });

  it("runs the self-hosted edition from its own repository", () => {
    expect(SELF_HOST_REPO).toBe("https://github.com/turjuman-translator/cli");
    expect(SELF_HOST_COMMANDS).toEqual([
      "git clone https://github.com/turjuman-translator/cli.git turjuman",
      "cd turjuman",
      "pnpm install && pnpm build",
      "pnpm turjuman setup",
      "pnpm turjuman start",
    ]);
    expect(DOCS_URL).toBe(`${SELF_HOST_REPO}#readme`);
    expect(LICENSE_URL).toBe("https://github.com/turjuman-translator/website/blob/main/LICENSE");
    expect(GITHUB_URL).toBe("https://github.com/turjuman-translator/website");
  });

  it("has the same words in every language", () => {
    const keys = Object.keys(DICTS.en).sort();
    for (const lang of SITE_LANGS) {
      expect(Object.keys(DICTS[lang]).sort()).toEqual(keys);
      for (const v of Object.values(DICTS[lang])) expect(v.trim()).not.toBe("");
    }
  });

  it("uses the app's words for what the app also names", () => {
    const arabic = { en: "Arabic", nl: "Arabisch", ar: "العربية" } as const;
    const same: ReadonlyArray<[SiteKey, MsgKey]> = [
      ["navLabel", "nav.main"],
      ["langLabel", "lang.label"],
      ["login", "login.title"],
      ["copy", "common.copy"],
      ["copied", "common.copied"],
      ["cus_look", "step.theme"],
      ["cus_layout", "step.layout"],
      ["cus_size", "b.textSize"],
      ["cd_blocks", "b.blocks"],
      ["cd_rolling", "b.rolling"],
      ["cd_quran", "b.quranAr"],
      ["cd_preview", "b.previewAria"],
      ["moments", "sc.prayer"],
      ["m_athan", "ev.athan"],
      ["m_iqama", "ev.iqama"],
      ["m_salah", "ev.salah"],
    ];
    for (const lang of SITE_LANGS) {
      const d = DICTS[lang];
      for (const [site, app] of same) expect([site, d[site]]).toEqual([site, message(lang, app)]);
      expect(d.cd_src).toBe(message(lang, "b.srcText", { lang: arabic[lang] }));
      expect(d.t1.startsWith(message(lang, "foot.free"))).toBe(true);
    }
    expect(DICTS.en.acc_h).toBe(message("en", "signup.docTitle"));
    expect(DICTS.nl.acc_h).toBe(message("nl", "signup.docTitle"));
    expect(DICTS.ar.acc_h).toBe(message("ar", "login.signup"));
  });

  it("names the built-in themes like the app, falling back to the preset's own name", () => {
    expect(presetName("nl", "mosque-dark", "x")).toBe("Moskee donker");
    expect(presetName("ar", "nope", "Nope")).toBe("Nope");
  });

  it("counts the themes the app really has", () => {
    expect(BUILTIN_PRESETS).toHaveLength(10);
    expect(DICTS.en.cus_p).toMatch(/^Ten /);
    expect(DICTS.nl.cus_p).toMatch(/^Tien /);
    expect(DICTS.ar.cus_p).toMatch(/^عشرة /);
  });

  it("refuses a template with an unknown placeholder", () => {
    expect(() => fillTemplate("<p>{{nope}}</p>", {})).toThrow(/nope/);
    expect(fillTemplate("<p>{{a}}</p>", { a: "&amp;" })).toBe("<p>&amp;</p>");
  });
});
