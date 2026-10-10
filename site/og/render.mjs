// Draws the website's Open Graph pictures (og-en/nl/ar.png, 1200×630), its home-screen icon
// (touch-icon.png, 180×180) and its icon as a PNG (favicon.png, 192×192: Google Search shows PNG
// favicons, not SVG) in Chrome, with the built site's own stylesheet and fonts. The PNGs are
// committed; run this after a copy or brand change, then build again (name files to draw only
// those, e.g. `… render.mjs favicon.png`):
//   pnpm build:site && pnpm exec tsx site/og/render.mjs && pnpm build:site
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { iconSvg } from "../../scripts/build-site.ts";
import { markSvg, ON_PINE, wordmarkHtml } from "../../web/shared/brand.ts";
import { HEADLINE_AR, headlineFor } from "../content/khutbah.ts";
import { DICTS } from "../content/strings.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "site", "og");
const BASE = "http://og.turjuman.test";
/** Only these files, when named on the command line. */
const ONLY = process.argv.slice(2);

const built = await readFile(path.join(ROOT, "public/site/hosted/en/home.html"), "utf8");
const css = /<link rel="stylesheet" href="([^"]+)">/.exec(built)?.[1];
if (css === undefined) throw new Error("build the site first (pnpm build:site)");

const STYLE = `
  html, body { margin: 0; }
  body.og {
    position: relative; width: 1200px; height: 630px; overflow: hidden; box-sizing: border-box;
    padding: 56px 72px; display: grid; grid-template-rows: auto 1fr;
    background-color: var(--tj-paper);
    background-image: radial-gradient(circle at 11px 11px, rgb(18 25 22 / 11%) 1.1px, transparent 1.6px);
    background-size: 22px 22px;
  }
  .og .wm { gap: 14px; }
  .og .wm svg { height: 46px; }
  .og .wm .tj-wm-lat, .og .wm .tj-wm-ar { font-size: 30px; }
  .og .wm i { height: 30px; }
  .og-mid { align-self: center; display: grid; justify-items: center; gap: 14px; text-align: center; padding-bottom: 40px; }
  .og-ar { margin: 0; font: 500 58px / 1.45 var(--tj-naskh); color: var(--tj-g800); }
  .og-h { margin: 0; max-width: 22ch; font-size: 86px; }
  .og-arh { margin: 0; font: 500 96px / 1.45 var(--tj-naskh); color: var(--tj-g800); white-space: nowrap; }
  .og-lead { margin: 0; font: 400 36px / 1.5 var(--tj-sans); color: var(--tj-slate); white-space: nowrap; }
  body.icon { width: 180px; height: 180px; display: grid; place-items: center; background: var(--tj-g800); }
  body.icon svg { width: auto; height: 122px; }
  html:has(> body.fav), body.fav { background: transparent; }
  body.fav { width: 192px; height: 192px; }
  body.fav svg { display: block; width: 192px; height: 192px; }
`;

function page(lang, body, cls = "og") {
  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head>
<meta charset="utf-8"><link rel="stylesheet" href="${css}"><style>${STYLE}</style></head>
<body class="${cls}">${body}</body></html>`;
}

function ogBody(lang) {
  const mid =
    lang === "ar"
      ? `<p class="og-arh">${HEADLINE_AR}</p><p class="og-lead">${DICTS.ar.lead}</p>`
      : `<p class="og-ar" lang="ar" dir="rtl">${HEADLINE_AR}</p>` +
        `<p class="display og-h">${headlineFor(lang)}</p>`;
  return `<div>${wordmarkHtml("wm")}</div><div class="og-mid">${mid}</div>`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const shoot = async (html, size, file, transparent = false) => {
    if (ONLY.length > 0 && !ONLY.includes(file)) return;
    const p = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    await p.route(`${BASE}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/page") {
        await route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
        return;
      }
      const name = url.pathname.replace("/site-assets/", "");
      await route.fulfill({ path: path.join(ROOT, "public/site/assets", name) });
    });
    await p.goto(`${BASE}/page`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, file), omitBackground: transparent });
    await p.close();
    console.log(`  site/og/${file}`);
  };
  for (const lang of ["en", "nl", "ar"]) {
    await shoot(page(lang, ogBody(lang)), { width: 1200, height: 630 }, `og-${lang}.png`);
  }
  await shoot(page("en", markSvg(ON_PINE), "icon"), { width: 180, height: 180 }, "touch-icon.png");
  // The pages' SVG icon (the app tile), drawn as it is.
  await shoot(page("en", iconSvg(), "fav"), { width: 192, height: 192 }, "favicon.png", true);
} finally {
  await browser.close();
}
