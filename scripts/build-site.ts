// The website build: `pnpm build:site`, also part of `pnpm build`.
//   public/site/<mode>/<lang>/<page>.html   every page (site/content/pages.ts) in every language,
//                                           for the public website (mode "hosted": /, /nl/…) and
//                                           for the preview a local server shows ("local": /site/…)
//   public/site/<mode>/routes.json          route → page file, the server's explicit routes
//   public/site/hosted/sitemap.xml          every page of the public website in every language,
//                                           with its hreflang alternates (served at /sitemap.xml)
//   public/site/assets/<name>-<hash>.*      the scripts, the CSS, fonts, icons and Open Graph
//                                           pictures (immutable), served at /site-assets/
// The real caption CSS (web/shared/blocks.css, rollup.css, hon.css) is scoped under
// .capdemo-stage on the way in, and the pages never inline a script or a style (CSP).
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { parse as parseYaml } from "yaml";
import { SITE_LANGS, type SiteLang } from "../site/content/khutbah.js";
import { SITE_MODES } from "../site/content/links.js";
import { checkPages, PAGES, pagePath } from "../site/content/pages.js";
import { ORIGIN_TOKEN, renderPage } from "../site/render/page.js";
import { scopeCaptionCss } from "../site/render/scope-css.js";
import { sitemapXml } from "../site/render/seo.js";
import { ARCH_PATH, ON_PINE, PINE } from "../web/shared/brand.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const PUBLIC_PATH = "/site-assets";
const CAPTION_CSS = ["blocks.css", "rollup.css", "hon.css"] as const;
const STAGE = ".capdemo-stage";
/** The fonts of the first screen (nav, the Arabic line, the headline): preloaded. Readex Pro
 *  Arabic is there on every page (the wordmark's ترجمان and the language switch). */
const FIRST_SCREEN_FONTS = [
  /^readex-pro-latin-full-normal-/,
  /^readex-pro-arabic-full-normal-/,
  /^noto-naskh-arabic-arabic-500-normal-/,
];

/** `@import "site:caption.css"` → the caption page's stylesheets, scoped to the demo stage. */
function captionCssPlugin(): esbuild.Plugin {
  const dir = path.join(ROOT, "web", "shared");
  return {
    name: "site-caption-css",
    setup(build) {
      build.onResolve({ filter: /^site:caption\.css$/ }, () => ({
        path: "caption.css",
        namespace: "site-caption",
      }));
      build.onLoad({ filter: /.*/, namespace: "site-caption" }, async () => {
        const files = await Promise.all(
          CAPTION_CSS.map(async (name) => ({
            name,
            css: await readFile(path.join(dir, name), "utf8"),
          })),
        );
        return {
          contents: scopeCaptionCss(files, STAGE),
          loader: "css",
          resolveDir: dir,
          watchFiles: CAPTION_CSS.map((name) => path.join(dir, name)),
        };
      });
    },
  };
}

/** The app tile (the mark on pine) as the pages' icon. */
export function iconSvg(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<rect width="64" height="64" rx="14" fill="${PINE.arch}"/>` +
    '<g transform="translate(32 32.6) scale(.72) translate(-32 -32.6)" fill="none" ' +
    'stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">' +
    `<path d="${ARCH_PATH}" stroke="${ON_PINE.arch}"/>` +
    `<path d="M31 33H43" stroke="${ON_PINE.arabic}"/>` +
    `<path d="M21 42H39" stroke="${ON_PINE.translation}"/></g></svg>\n`
  );
}

function hashed(dir: string, name: string, ext: string, body: string | Buffer): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
  return path.join(dir, `${name}-${hash}${ext}`);
}

/** The languages Turjuman hears and translates: the languages.yaml entries with a Soniox code,
 *  each in its own name, for the grid on How it works. */
export async function captionLanguages(): Promise<Array<{ code: string; native: string }>> {
  const doc = parseYaml(await readFile(path.join(ROOT, "languages.yaml"), "utf8")) as {
    languages?: Record<string, { native?: unknown; soniox?: unknown }>;
  };
  const out: Array<{ code: string; native: string }> = [];
  for (const [code, e] of Object.entries(doc.languages ?? {})) {
    if (typeof e?.soniox === "string" && typeof e.native === "string") {
      out.push({ code, native: e.native });
    }
  }
  if (out.length === 0)
    throw new Error("build:site: no languages with a Soniox code in languages.yaml");
  return out;
}

export interface SiteBuildResult {
  files: string[];
  ms: number;
}

export async function buildSite(
  opts: { dev?: boolean; outDir?: string } = {},
): Promise<SiteBuildResult> {
  const t0 = performance.now();
  const dev = opts.dev ?? false;
  const out = opts.outDir ?? path.join(ROOT, "public", "site");
  const assetsDir = path.join(out, "assets");
  const publicUrl = (file: string): string =>
    `${PUBLIC_PATH}/${path.relative(assetsDir, file).split(path.sep).join("/")}`;
  await mkdir(assetsDir, { recursive: true });

  checkPages(PAGES);
  const entries = {
    site: path.join(SITE, "styles", "site.css"),
    home: path.join(SITE, "client", "main.ts"),
    page: path.join(SITE, "client", "page.ts"),
  };
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: entries,
    bundle: true,
    format: "esm",
    target: ["chrome103", "edge103", "firefox115", "safari16"],
    minify: !dev,
    sourcemap: dev ? "linked" : false,
    legalComments: "none",
    charset: "utf8",
    metafile: true,
    outdir: assetsDir,
    entryNames: "[name]-[hash]",
    assetNames: "[name]-[hash]",
    publicPath: PUBLIC_PATH,
    loader: { ".woff2": "file" },
    plugins: [captionCssPlugin()],
    logLevel: "silent",
  });
  const outputs = Object.keys(result.metafile.outputs).map((o) => path.resolve(ROOT, o));
  const outputOf = (entry: string): string => {
    const found = Object.entries(result.metafile.outputs).find(
      ([, info]) => info.entryPoint !== undefined && path.resolve(ROOT, info.entryPoint) === entry,
    );
    if (found === undefined) throw new Error(`build:site: no output for ${entry}`);
    return publicUrl(path.resolve(ROOT, found[0]));
  };
  const fonts = FIRST_SCREEN_FONTS.map((re) => {
    const file = outputs.find((o) => re.test(path.basename(o)));
    if (file === undefined) throw new Error(`build:site: no font for the first screen: ${re}`);
    return publicUrl(file);
  });

  // The icons and the Open Graph pictures (site/og, made by site/og/render.mjs).
  const icon = iconSvg();
  const iconFile = hashed(assetsDir, "icon", ".svg", icon);
  await writeFile(iconFile, icon);
  const copied: string[] = [iconFile];
  const copy = async (src: string, name: string): Promise<string> => {
    const body = await readFile(path.join(SITE, "og", src));
    const file = hashed(assetsDir, name, path.extname(src), body);
    await writeFile(file, body);
    copied.push(file);
    return publicUrl(file);
  };
  const touchIcon = await copy("touch-icon.png", "touch-icon");
  const iconPng = await copy("favicon.png", "favicon");
  const og = {} as Record<SiteLang, string>;
  for (const lang of SITE_LANGS) og[lang] = await copy(`og-${lang}.png`, `og-${lang}`);

  const names = [...new Set(PAGES.map((p) => p.template ?? p.id))];
  const templates = {
    layout: await readFile(path.join(SITE, "layout.html"), "utf8"),
    pages: Object.fromEntries(
      await Promise.all(
        names.map(
          async (n) => [n, await readFile(path.join(SITE, "pages", `${n}.html`), "utf8")] as const,
        ),
      ),
    ),
  };
  const data = { languages: await captionLanguages() };
  const assets = {
    scripts: { home: outputOf(entries.home), page: outputOf(entries.page) },
    style: outputOf(entries.site),
    icon: publicUrl(iconFile),
    iconPng,
    touchIcon,
    og,
    fonts,
  };
  const pages: string[] = [];
  for (const mode of SITE_MODES) {
    // Earlier builds' pages go (a page may have been removed or renamed).
    await rm(path.join(out, mode), { force: true, recursive: true });
    const routes: Record<string, string> = {};
    for (const lang of SITE_LANGS) {
      await mkdir(path.join(out, mode, lang), { recursive: true });
      for (const page of PAGES) {
        const rel = `${lang}/${page.id}.html`;
        const file = path.join(out, mode, rel);
        await writeFile(file, renderPage(templates, page, lang, assets, mode, data));
        // The 404 page is served for unknown addresses, never at an address of its own.
        if (!page.notFound) routes[pagePath(mode, lang, page.slug)] = rel;
        pages.push(file);
      }
    }
    const manifest = path.join(out, mode, "routes.json");
    await writeFile(manifest, `${JSON.stringify({ routes }, null, 2)}\n`);
    pages.push(manifest);
    // Only the public website has a sitemap: a self-hosted server is not for search engines.
    if (mode === "hosted") {
      const sitemap = path.join(out, mode, "sitemap.xml");
      await writeFile(sitemap, sitemapXml(ORIGIN_TOKEN));
      pages.push(sitemap);
    }
  }

  // Hashed files of earlier builds go, and the pages of the one-page site.
  const keep = new Set([...copied, ...outputs]);
  for (const name of await readdir(assetsDir)) {
    const file = path.join(assetsDir, name);
    if (!keep.has(file)) await rm(file, { force: true, recursive: true });
  }
  for (const lang of SITE_LANGS) await rm(path.join(out, `${lang}.html`), { force: true });

  return {
    files: [...pages, ...[...keep].sort()].map((f) => path.relative(ROOT, f)),
    ms: Math.round(performance.now() - t0),
  };
}

function formatError(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err && Array.isArray(err.errors)) {
    return esbuild
      .formatMessagesSync(err.errors as esbuild.Message[], {
        kind: "error",
        color: process.stdout.isTTY,
      })
      .join("\n");
  }
  return err instanceof Error ? err.message : String(err);
}

async function main(): Promise<void> {
  try {
    const r = await buildSite({ dev: process.argv.includes("--dev") });
    for (const f of r.files) console.log(`  ${f}`);
    console.log(`build:site: ${r.files.length} files in ${r.ms} ms`);
  } catch (err) {
    console.error(`build:site: failed:\n${formatError(err)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
