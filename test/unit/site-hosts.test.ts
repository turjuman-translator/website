// The hostname is never configured: a hosted server made by a first start (no hosted.publicUrl)
// writes every absolute URL with the hostname of the request, the one its proxy forwards
// (X-Forwarded-Host and X-Forwarded-Proto, trusted from the proxy only). One server answers two
// hostnames, each with its own canonical, hreflang, Open Graph, JSON-LD, sitemap and robots.txt,
// and the app's screen links.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { pino } from "pino";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { captionLanguages } from "../../scripts/build-site.js";
import { SITE_LANGS } from "../../site/content/khutbah.js";
import { PAGES, pageById, pagePath } from "../../site/content/pages.js";
import { ORIGIN_TOKEN, type PageAssets, renderPage } from "../../site/render/page.js";
import { sitemapXml } from "../../site/render/seo.js";
import { ScreenStore } from "../../src/accounts/screens.js";
import { SigningSecret } from "../../src/accounts/secret.js";
import { type LoadedConfig, loadConfig, newConfigYaml } from "../../src/config.js";
import type { SessionManagerApi } from "../../src/core/contracts.js";
import { buildApp } from "../../src/server/app.js";

const read = (file: string): string =>
  readFileSync(new URL(`../../site/${file}`, import.meta.url), "utf8");
const templates = {
  layout: read("layout.html"),
  pages: Object.fromEntries(
    [...new Set(PAGES.map((p) => p.template ?? p.id))].map((n) => [n, read(`pages/${n}.html`)]),
  ),
};
const assets: PageAssets = {
  scripts: { home: "/site-assets/home.js", page: "/site-assets/page.js" },
  style: "/site-assets/site.css",
  icon: "/site-assets/icon.svg",
  iconPng: "/site-assets/favicon.png",
  touchIcon: "/site-assets/touch.png",
  og: { en: "/site-assets/og-en.png", nl: "/site-assets/og-nl.png", ar: "/site-assets/og-ar.png" },
  fonts: [],
};

let root: string;
let loaded: LoadedConfig;
let app: FastifyInstance;
let guid: string;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "site-hosts-"));
  const publicDir = join(root, "public");
  for (const dir of ["assets", "fonts", "site/assets"]) {
    mkdirSync(join(publicDir, dir), { recursive: true });
  }
  // The built website, as scripts/build-site.ts writes it: the home pages and the sitemap with the
  // origin left open.
  const data = { languages: await captionLanguages() };
  const routes: Record<string, string> = {};
  for (const lang of SITE_LANGS) {
    mkdirSync(join(publicDir, "site", "hosted", lang), { recursive: true });
    for (const id of ["home", "not-found"]) {
      writeFileSync(
        join(publicDir, "site", "hosted", lang, `${id}.html`),
        renderPage(templates, pageById(id), lang, assets, "hosted", data),
      );
    }
    routes[pagePath("hosted", lang, "")] = `${lang}/home.html`;
  }
  writeFileSync(join(publicDir, "site", "hosted", "routes.json"), JSON.stringify({ routes }));
  writeFileSync(join(publicDir, "site", "hosted", "sitemap.xml"), sitemapXml(ORIGIN_TOKEN));

  // A first start's config.yaml, and nothing else: no hostname anywhere.
  writeFileSync(
    join(root, "config.yaml"),
    `${newConfigYaml("hosted")}languagesFile: ${join(process.cwd(), "languages.yaml")}\n`,
  );
  loaded = loadConfig({ env: { CONFIG_DIR: root, DATA_DIR: root }, cwd: root });
  expect(loaded.config.hosted.publicUrl).toBeNull();
  const screens = new ScreenStore(loaded.paths.screensFile);
  guid = screens.create(
    { name: "Main hall", ownerId: null, from: "ar", to: "nl", query: "" },
    { id: null, name: "test" },
  ).guid;
  const manager = {
    list: vi.fn(() => []),
    get: vi.fn(),
    local: vi.fn(() => null),
    stopAll: vi.fn(),
  } as unknown as SessionManagerApi;
  app = await buildApp({
    loaded,
    manager,
    log: pino({ level: "silent" }),
    publicDir,
    version: "test",
    screens,
    secret: new SigningSecret(loaded.paths.secretFile, ""),
  });
});

afterAll(async () => {
  await app.close();
  rmSync(root, { recursive: true, force: true });
});

/** A request as nginx forwards it: Host is the upstream, the browser's host is forwarded. */
const viaProxy = (host: string, proto: string, extra: Record<string, string> = {}) => ({
  host: "127.0.0.1:8765",
  "x-forwarded-host": host,
  "x-forwarded-proto": proto,
  "x-forwarded-for": "198.51.100.7",
  accept: "text/html",
  ...extra,
});

async function page(url: string, headers: Record<string, string>): Promise<string> {
  const res = await app.inject({ url, headers });
  expect(res.statusCode).toBe(200);
  return res.body;
}

describe("one hosted server, two hostnames", () => {
  for (const [host, proto] of [
    ["example.org", "https"],
    ["captions.other.test", "http"],
  ] as const) {
    const origin = `${proto}://${host}`;

    it(`writes the website's absolute URLs with ${origin}`, async () => {
      const home = await page("/", viaProxy(host, proto));
      expect(home).toContain(`<link rel="canonical" href="${origin}/">`);
      expect(home).toContain(`<meta property="og:url" content="${origin}/">`);
      expect(home).toContain(`<link rel="alternate" hreflang="nl" href="${origin}/nl">`);
      expect(home).toContain(`<link rel="alternate" hreflang="x-default" href="${origin}/">`);
      expect(home).toContain(
        `<meta property="og:image" content="${origin}/site-assets/og-en.png">`,
      );
      expect(home).toContain(`"url":"${origin}/"`);
      expect(home).not.toContain(ORIGIN_TOKEN);
      const nl = await page("/nl", viaProxy(host, proto));
      expect(nl).toContain(`<link rel="canonical" href="${origin}/nl">`);
      // No other origin appears in an absolute URL of the page.
      const others = [...home.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)]
        .map((m) => m[1])
        .filter(
          (h) =>
            h !== host &&
            !/github\.com|soniox\.com|schema\.org|w3\.org|tanzil\.net|ogp\.me/.test(h ?? ""),
        );
      expect(others).toEqual([]);
    });

    it(`serves the sitemap and robots.txt for ${origin}`, async () => {
      const sitemap = await page("/sitemap.xml", viaProxy(host, proto));
      expect(sitemap).toContain(`<loc>${origin}/</loc>`);
      expect(sitemap).toContain(`<loc>${origin}/nl/install</loc>`);
      expect(sitemap).not.toContain(ORIGIN_TOKEN);
      const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
      expect(locs.length).toBeGreaterThan(10);
      expect(locs.every((l) => l.startsWith(`${origin}/`))).toBe(true);
      const robots = await page("/robots.txt", viaProxy(host, proto));
      expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml\n`);
    });

    it(`gives the app's screen links on ${origin}`, async () => {
      const res = await app.inject({
        url: "/api/screens",
        headers: viaProxy(host, proto, { authorization: `Bearer ${loaded.config.server.token}` }),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()[0].url).toBe(`${origin}/feed/${guid}`);
    });
  }

  it("uses the Host header when no proxy forwards one (a port included)", async () => {
    const home = await page("/", { host: "mosque.example:8080", accept: "text/html" });
    expect(home).toContain('<link rel="canonical" href="http://mosque.example:8080/">');
  });

  it("ignores X-Forwarded-Host from a client that is not the proxy", async () => {
    const res = await app.inject({
      url: "/robots.txt",
      remoteAddress: "203.0.113.9",
      headers: {
        host: "turjuman.example",
        "x-forwarded-host": "evil.test",
        "x-forwarded-proto": "https",
      },
    });
    expect(res.body).toContain("Sitemap: http://turjuman.example/sitemap.xml\n");
  });
});
