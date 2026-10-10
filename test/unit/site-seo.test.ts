// What the website tells search engines (docs/seo.md): robots.txt, sitemap.xml with reciprocal
// hreflang alternates, X-Robots-Tag: noindex on everything that is not the public website, each
// page's title and description, and the home pages' structured data (JSON-LD).
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { pino } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captionLanguages } from "../../scripts/build-site.js";
import { inLang } from "../../site/content/doc.js";
import { DOC_PAGES } from "../../site/content/docs/index.js";
import { SITE_LANGS, type SiteLang } from "../../site/content/khutbah.js";
import { GITHUB_ORG, LICENSE_URL } from "../../site/content/links.js";
import { PAGES, pageById, pagePath } from "../../site/content/pages.js";
import { ORIGIN_TOKEN, type PageAssets, renderPage } from "../../site/render/page.js";
import {
  homeStructuredData,
  indexablePages,
  jsonLdScript,
  pageMeta,
  sitemapXml,
} from "../../site/render/seo.js";
import { SigningSecret } from "../../src/accounts/secret.js";
import { loadConfig } from "../../src/config.js";
import type { SessionManagerApi } from "../../src/core/contracts.js";
import { buildApp } from "../../src/server/app.js";
import { applyHtmlHeaders } from "../../src/server/security.js";
import { NOINDEX, registerSite, robotsTxt } from "../../src/server/site.js";
import type { AppMode } from "../../src/shared/protocol.js";

const ORIGIN = "https://turjuman.example";

// --- a small XML reader: enough to prove the sitemap is well-formed and to walk it ---------------

interface XmlEl {
  name: string;
  attrs: Record<string, string>;
  children: XmlEl[];
  text: string;
}

const ENTITY = /&(?:amp|lt|gt|quot|apos);/g;
const unescapeXml = (s: string): string =>
  s.replace(ENTITY, (e) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"' })[e] ?? "'");

/** Parses XML of elements, attributes and text (no comments, CDATA or DTD); throws when it is not
 *  well-formed: an unknown token, a bare "&" or "<", a mismatched or unclosed tag, two roots. */
function parseXml(xml: string): XmlEl {
  const token =
    /<\?xml\s[^?]*\?>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/y;
  const root: XmlEl = { name: "#document", attrs: {}, children: [], text: "" };
  const stack: XmlEl[] = [root];
  let at = 0;
  while (at < xml.length) {
    token.lastIndex = at;
    const m = token.exec(xml);
    if (m === null) throw new Error(`not well-formed at ${at}: ${xml.slice(at, at + 40)}`);
    at = token.lastIndex;
    const [, close, open, attrs = "", selfClose, text] = m;
    const top = stack[stack.length - 1] as XmlEl;
    if (close !== undefined) {
      if (top.name !== close) throw new Error(`</${close}> closes <${top.name}>`);
      stack.pop();
    } else if (open !== undefined) {
      const el: XmlEl = { name: open, attrs: {}, children: [], text: "" };
      for (const a of attrs.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
        const [, k = "", v = ""] = a;
        if (k in el.attrs) throw new Error(`duplicate attribute ${k}`);
        if (/&(?!(?:amp|lt|gt|quot|apos);)/.test(v)) throw new Error(`bare & in ${k}`);
        el.attrs[k] = unescapeXml(v);
      }
      top.children.push(el);
      if (selfClose !== "/") stack.push(el);
    } else if (text !== undefined) {
      if (/&(?!(?:amp|lt|gt|quot|apos);)/.test(text)) throw new Error("bare & in text");
      if (top === root && text.trim() !== "") throw new Error("text outside the root element");
      top.text += unescapeXml(text);
    }
  }
  if (stack.length !== 1) throw new Error(`<${stack[stack.length - 1]?.name}> is not closed`);
  if (root.children.length !== 1) throw new Error("not exactly one root element");
  return root.children[0] as XmlEl;
}

describe("site: robots.txt", () => {
  /** The rules Lighthouse's robots-txt audit applies: known directives, a user-agent before any
   *  allow/disallow, patterns from "/" or "*", an absolute sitemap URL. */
  function lighthouseErrors(txt: string): string[] {
    const known = new Set(["user-agent", "allow", "disallow", "sitemap"]);
    const errors: string[] = [];
    let inGroup = false;
    for (const raw of txt.split("\n")) {
      const line = raw.replace(/#.*/, "").trim();
      if (line === "") continue;
      const colon = line.indexOf(":");
      const name = line.slice(0, colon).trim().toLowerCase();
      const value = line.slice(colon + 1).trim();
      if (colon === -1 || !known.has(name)) errors.push(`unknown: ${line}`);
      if (name === "user-agent") inGroup = value !== "";
      if ((name === "allow" || name === "disallow") && (!inGroup || !/^(?:$|[/*])/.test(value)))
        errors.push(`bad rule: ${line}`);
      if (name === "sitemap" && !/^https?:\/\/[^/]+\/\S+$/.test(value)) errors.push(line);
    }
    return errors;
  }

  it("lets every crawler into the public website and names its sitemap (absolute URL)", () => {
    const txt = robotsTxt("hosted", ORIGIN);
    expect(txt).toContain("User-agent: *\nAllow: /\n");
    expect(txt).toContain(`\nSitemap: ${ORIGIN}/sitemap.xml\n`);
    // Nothing is disallowed: noindex (X-Robots-Tag) only works on pages a crawler may fetch.
    expect(txt).not.toMatch(/^Disallow/im);
    expect(lighthouseErrors(txt)).toEqual([]);
    // Without a usable origin there is no sitemap line rather than a relative one.
    expect(robotsTxt("hosted", "")).not.toContain("Sitemap");
    expect(lighthouseErrors(robotsTxt("hosted", ""))).toEqual([]);
  });

  it("keeps every crawler out of a self-hosted server", () => {
    const txt = robotsTxt("local", ORIGIN);
    expect(txt).toContain("User-agent: *\nDisallow: /\n");
    expect(txt).not.toContain("Sitemap");
    expect(lighthouseErrors(txt)).toEqual([]);
  });
});

describe("site: sitemap.xml", () => {
  const xml = sitemapXml(ORIGIN);
  const urlset = parseXml(xml);
  const urls = urlset.children;
  const loc = (u: XmlEl): string => u.children.find((c) => c.name === "loc")?.text ?? "";
  const alternates = (u: XmlEl): Record<string, string> =>
    Object.fromEntries(
      u.children
        .filter((c) => c.name === "xhtml:link")
        .map((c) => {
          expect(c.attrs.rel).toBe("alternate");
          return [c.attrs.hreflang ?? "", c.attrs.href ?? ""];
        }),
    );

  it("is a well-formed urlset in the sitemap and XHTML namespaces", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(urlset.name).toBe("urlset");
    expect(urlset.attrs.xmlns).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");
    expect(urlset.attrs["xmlns:xhtml"]).toBe("http://www.w3.org/1999/xhtml");
    expect(urls.every((u) => u.name === "url")).toBe(true);
    // What Google ignores, or what the build cannot know truthfully, is left out.
    expect(xml).not.toMatch(/<(lastmod|priority|changefreq)>/);
    expect(() => parseXml("<urlset><url></urlset>")).toThrow();
    expect(() => parseXml("<a>&</a>")).toThrow();
  });

  it("lists every page of the website once in every language, and not the 404 page", () => {
    const expected = indexablePages().flatMap((p) =>
      SITE_LANGS.map((l) => `${ORIGIN}${pagePath("hosted", l, p.slug)}`),
    );
    expect(urls.map(loc).sort()).toEqual([...expected].sort());
    expect(new Set(urls.map(loc)).size).toBe(urls.length);
    expect(urls).toHaveLength((PAGES.length - 1) * SITE_LANGS.length);
    expect(xml).not.toContain("not-found");
  });

  it("gives each URL every language version and English as x-default, reciprocally", () => {
    const byLoc = new Map(urls.map((u) => [loc(u), alternates(u)]));
    for (const u of urls) {
      const alt = alternates(u);
      expect(Object.keys(alt).sort()).toEqual([...SITE_LANGS, "x-default"].sort());
      expect(alt["x-default"]).toBe(alt.en);
      // The URL is its own language's alternate …
      const own = Object.entries(alt).find(([l, href]) => l !== "x-default" && href === loc(u));
      expect(own).toBeDefined();
      // … and every alternate is listed, pointing back to it.
      for (const [l, href] of Object.entries(alt)) {
        if (l === "x-default") continue;
        expect(byLoc.get(href)?.[own?.[0] ?? ""]).toBe(loc(u));
      }
    }
  });

  it("names the same addresses as each page's canonical link and hreflang tags", async () => {
    const page = renderPage(
      {
        layout: readFileSync(new URL("../../site/layout.html", import.meta.url), "utf8"),
        pages: {
          doc: readFileSync(new URL("../../site/pages/doc.html", import.meta.url), "utf8"),
        },
      },
      pageById("install"),
      "nl",
      ASSETS,
      "hosted",
      { languages: await captionLanguages() },
    ).replaceAll(ORIGIN_TOKEN, ORIGIN);
    const entry = urls.find((u) => loc(u) === `${ORIGIN}/nl/install`);
    expect(entry).toBeDefined();
    expect(page).toContain(`<link rel="canonical" href="${ORIGIN}/nl/install">`);
    for (const [l, href] of Object.entries(alternates(entry as XmlEl))) {
      expect(page).toContain(`<link rel="alternate" hreflang="${l}" href="${href}">`);
    }
  });
});

const ASSETS: PageAssets = {
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
  fonts: [],
};

describe("site: titles and descriptions", () => {
  const pages = indexablePages();
  /** Words of empty marketing copy, and what Turjuman does not use. */
  const BANNED =
    /\b(seamless(ly)?|empower\w*|revolutioni[sz]\w*|unlock\w*|cutting-edge|game-chang\w*|AI-powered|Gemini|LLM|composer)\b/i;

  for (const lang of SITE_LANGS) {
    it(`${lang}: every page has its own title and description, of a length search shows`, () => {
      const metas = pages.map((p) => ({ id: p.id, ...pageMeta(p, lang) }));
      for (const { id, title, desc } of metas) {
        // Google shows about 50–60 characters of a title and about 150–160 of a description.
        expect([id, title.length >= 15 && title.length <= 60]).toEqual([id, true]);
        expect([id, desc.length >= 70 && desc.length <= 160]).toEqual([id, true]);
        expect([id, BANNED.test(title) || BANNED.test(desc)]).toEqual([id, false]);
        // The brand in every title; no title is only the brand.
        expect(title).toContain(lang === "ar" ? "ترجمان" : "Turjuman");
        expect(title.replace(/Turjuman|ترجمان|[\s·:|–-]/g, "").length).toBeGreaterThan(5);
        expect(desc).not.toBe(title);
      }
      expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
      expect(new Set(metas.map((m) => m.desc)).size).toBe(metas.length);
    });
  }

  it("never repeats a title or description across the languages either", () => {
    const all = pages.flatMap((p) => SITE_LANGS.map((l) => pageMeta(p, l)));
    expect(new Set(all.map((m) => m.title)).size).toBe(all.length);
    expect(new Set(all.map((m) => m.desc)).size).toBe(all.length);
  });

  it("are the pages' own <title> and meta description", async () => {
    const data = { languages: await captionLanguages() };
    const read = (f: string): string =>
      readFileSync(new URL(`../../site/${f}`, import.meta.url), "utf8");
    const templates = {
      layout: read("layout.html"),
      pages: { home: read("pages/home.html"), doc: read("pages/doc.html") },
    };
    const esc = (s: string): string =>
      s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    for (const lang of SITE_LANGS) {
      for (const page of pages) {
        const html = renderPage(templates, page, lang, ASSETS, "hosted", data);
        const { title, desc } = pageMeta(page, lang);
        expect(html).toContain(`<title>${esc(title)}</title>`);
        expect(html).toContain(`<meta name="description" content="${esc(desc)}">`);
        expect(html.match(/<title>/g)).toHaveLength(1);
        expect(html.match(/<meta name="description"/g)).toHaveLength(1);
      }
    }
  });

  it("takes a text page's title and description from its own content", () => {
    for (const [id, doc] of Object.entries(DOC_PAGES)) {
      for (const lang of SITE_LANGS) {
        const meta = pageMeta(pageById(id), lang as SiteLang);
        expect(meta).toEqual({ title: inLang(doc.title, lang), desc: inLang(doc.desc, lang) });
      }
    }
  });
});

describe("site: structured data (JSON-LD)", () => {
  const read = (f: string): string =>
    readFileSync(new URL(`../../site/${f}`, import.meta.url), "utf8");
  const templates = {
    layout: read("layout.html"),
    pages: { home: read("pages/home.html"), doc: read("pages/doc.html") },
  };
  const blocks = (html: string): string[] =>
    [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map(
      (m) => m[1] ?? "",
    );
  /** Every key anywhere in a JSON value. */
  const keys = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.flatMap(keys)
      : typeof v === "object" && v !== null
        ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)])
        : [];
  const strings = (v: unknown): string[] =>
    typeof v === "string"
      ? [v]
      : Array.isArray(v)
        ? v.flatMap(strings)
        : typeof v === "object" && v !== null
          ? Object.values(v).flatMap(strings)
          : [];

  for (const lang of SITE_LANGS) {
    it(`${lang}: the home page describes the organisation, the website and the app`, async () => {
      const data = { languages: await captionLanguages() };
      const html = renderPage(templates, pageById("home"), lang, ASSETS, "hosted", data);
      const found = blocks(html);
      expect(found).toHaveLength(1);
      expect(html.indexOf("application/ld+json")).toBeLessThan(html.indexOf("</head>"));
      const json = JSON.parse(found[0] ?? "") as { "@context": string; "@graph": unknown[] };
      expect(json["@context"]).toBe("https://schema.org");
      const graph = json["@graph"] as Array<Record<string, unknown>>;
      // The site name (WebSite) belongs to the domain's root page only.
      expect(graph.map((n) => n["@type"])).toEqual(
        lang === "en"
          ? ["Organization", "WebSite", "WebApplication"]
          : ["Organization", "WebApplication"],
      );
      const byType = (t: string): Record<string, unknown> =>
        graph.find((n) => n["@type"] === t) ?? {};
      const [org, app] = [byType("Organization"), byType("WebApplication")];
      expect(org).toMatchObject({
        name: "Turjuman",
        url: `${ORIGIN_TOKEN}/`,
        logo: { url: `${ORIGIN_TOKEN}${ASSETS.touchIcon}`, width: 180, height: 180 },
        sameAs: [GITHUB_ORG],
      });
      if (lang === "en") {
        const site = byType("WebSite");
        expect(site).toMatchObject({ name: "Turjuman", url: `${ORIGIN_TOKEN}/` });
        expect(site.publisher).toEqual({ "@id": org["@id"] });
      }
      expect(app.publisher).toEqual({ "@id": org["@id"] });
      expect(app).toMatchObject({
        name: "Turjuman",
        url: `${ORIGIN_TOKEN}${pagePath("hosted", lang, "")}`,
        description: pageMeta(pageById("home"), lang).desc,
        inLanguage: lang,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        license: LICENSE_URL,
      });
      // Only what is true: no ratings or reviews, no other site's addresses.
      expect(keys(json).filter((k) => /^(aggregateRating|reviews?|rating\w*)$/i.test(k))).toEqual(
        [],
      );
      for (const s of strings(json).filter((x) => /^(https?:|__TJ)/.test(x))) {
        expect(s.startsWith(`${ORIGIN_TOKEN}/`) || s.startsWith("https://")).toBe(true);
        if (s.startsWith("https://")) expect(s).toMatch(/^https:\/\/(schema\.org|github\.com)/);
      }
    });
  }

  it("is only on the public website's home pages", async () => {
    const data = { languages: await captionLanguages() };
    for (const lang of SITE_LANGS) {
      for (const page of PAGES) {
        const hosted = renderPage(templates, page, lang, ASSETS, "hosted", data);
        expect(blocks(hosted)).toHaveLength(page.id === "home" ? 1 : 0);
        expect(blocks(renderPage(templates, page, lang, ASSETS, "local", data))).toHaveLength(0);
      }
    }
  });

  it("can never close its own element", () => {
    const script = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(script.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(script.slice(script.indexOf(">") + 1, script.lastIndexOf("<")))).toEqual({
      name: "</script><script>alert(1)</script>",
    });
    expect(homeStructuredData("en", ORIGIN, { touchIcon: "/x.png" })).toMatchObject({
      "@graph": [
        { url: `${ORIGIN}/`, logo: { url: `${ORIGIN}/x.png` } },
        { url: `${ORIGIN}/` },
        {},
      ],
    });
  });
});

/** A built site (home, self-host, the 404 page, the sitemap) and the app's pages, as stubs. */
function writePublic(publicDir: string): void {
  mkdirSync(join(publicDir, "site", "assets"), { recursive: true });
  for (const dir of ["assets", "fonts"]) mkdirSync(join(publicDir, dir), { recursive: true });
  for (const page of [
    "picker",
    "caption",
    "overlay",
    "control",
    "customize",
    "archive",
    "login",
    "admin",
    "signup",
    "keys",
  ]) {
    writeFileSync(join(publicDir, `${page}.html`), `<!doctype html><title>${page}</title>`);
  }
  for (const mode of ["hosted", "local"] as const) {
    const routes: Record<string, string> = {};
    for (const lang of SITE_LANGS) {
      mkdirSync(join(publicDir, "site", mode, lang), { recursive: true });
      for (const [id, slug] of [
        ["home", ""],
        ["self-host", "self-host"],
        ["not-found", null],
      ] as const) {
        writeFileSync(
          join(publicDir, "site", mode, lang, `${id}.html`),
          `<!doctype html><title>${mode} ${lang} ${id}</title>`,
        );
        if (slug !== null) routes[pagePath(mode, lang, slug)] = `${lang}/${id}.html`;
      }
    }
    writeFileSync(join(publicDir, "site", mode, "routes.json"), JSON.stringify({ routes }));
  }
  writeFileSync(join(publicDir, "site", "hosted", "sitemap.xml"), sitemapXml(ORIGIN_TOKEN));
  writeFileSync(join(publicDir, "site", "assets", "site-ABC.css"), "body{margin:0}");
}

describe("site: what search engines may index (X-Robots-Tag)", () => {
  let root: string;
  let app: FastifyInstance | null = null;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "site-seo-"));
    writePublic(join(root, "public"));
  });

  afterEach(async () => {
    await app?.close();
    app = null;
    rmSync(root, { recursive: true, force: true });
  });

  async function serve(mode: AppMode, publicUrl: string | null = null): Promise<FastifyInstance> {
    writeFileSync(
      join(root, "config.yaml"),
      `mode: ${mode}\nhosted:\n  publicUrl: ${publicUrl ?? "null"}\n` +
        `languagesFile: ${join(process.cwd(), "languages.yaml")}\n`,
    );
    const loaded = loadConfig({ env: { CONFIG_DIR: root, DATA_DIR: root }, cwd: root });
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
      publicDir: join(root, "public"),
      version: "test",
      secret: new SigningSecret(loaded.paths.secretFile, ""),
    });
    return app;
  }

  const HTML = { accept: "text/html,application/xhtml+xml", host: "127.0.0.1:8765" };

  it("leaves the public website indexable, and says noindex on everything else", async () => {
    const a = await serve("hosted", "https://turjuman.example");
    for (const url of [
      "/",
      "/nl",
      "/ar",
      "/self-host",
      "/nl/self-host",
      "/ar/self-host",
      "/robots.txt",
      "/sitemap.xml",
      "/site-assets/site-ABC.css",
    ]) {
      const res = await a.inject({ url, headers: HTML });
      expect([url, res.statusCode, res.headers["x-robots-tag"]]).toEqual([url, 200, undefined]);
    }
    // A website file that does not exist is an error like any other: noindex.
    const gone = await a.inject({ url: "/site-assets/no-such-file.css", headers: HTML });
    expect([gone.statusCode, gone.headers["x-robots-tag"]]).toEqual([404, "noindex, nofollow"]);
    // A trailing slash is one redirect to the page, not a page of its own.
    const slash = await a.inject({ url: "/nl/", headers: HTML });
    expect([slash.statusCode, slash.headers["x-robots-tag"]]).toEqual([301, undefined]);
    for (const url of [
      "/app",
      "/app/new",
      "/app/look",
      "/app/keys",
      "/login",
      "/signup",
      "/admin",
      "/overlay",
      "/control",
      "/customize",
      "/ar/nl",
      "/nl/en",
      "/feed/0123456789abcdef",
      "/s/no-such-session",
      "/api/languages",
      "/api/auth/me",
      "/health",
      "/no-such-page",
      "/nl/no-such-page",
    ]) {
      const res = await a.inject({ url, headers: HTML });
      expect([url, res.headers["x-robots-tag"]]).toEqual([url, NOINDEX]);
    }
  });

  it("answers a missing page with a real 404 and noindex", async () => {
    const a = await serve("hosted");
    for (const url of ["/no-such-page", "/nl/no-such-page", "/ar/selfhost"]) {
      const res = await a.inject({ url, headers: HTML });
      expect([url, res.statusCode, res.headers["x-robots-tag"]]).toEqual([url, 404, NOINDEX]);
      expect(res.body).toContain("not-found</title>");
    }
  });

  it("serves robots.txt and the sitemap with the public URL as the origin", async () => {
    const a = await serve("hosted", "https://turjuman.example/");
    const robots = await a.inject({ url: "/robots.txt", headers: { host: "localhost:9" } });
    expect(robots.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(robots.body).toContain("Sitemap: https://turjuman.example/sitemap.xml\n");
    const sitemap = await a.inject({ url: "/sitemap.xml", headers: { host: "localhost:9" } });
    expect(sitemap.statusCode).toBe(200);
    expect(sitemap.headers["content-type"]).toBe("application/xml; charset=utf-8");
    expect(sitemap.body).not.toContain(ORIGIN_TOKEN);
    expect(sitemap.body).toContain("<loc>https://turjuman.example/nl/install</loc>");
    expect(() => parseXml(sitemap.body)).not.toThrow();
  });

  it("keeps a self-hosted server out of search engines entirely", async () => {
    const a = await serve("local");
    const robots = await a.inject({ url: "/robots.txt" });
    expect(robots.statusCode).toBe(200);
    expect(robots.body).toContain("User-agent: *\nDisallow: /\n");
    expect((await a.inject({ url: "/sitemap.xml" })).statusCode).toBe(404);
    for (const url of ["/", "/site", "/site/nl/self-host", "/app", "/robots.txt", "/nl/en"]) {
      const res = await a.inject({ url, headers: { accept: "text/html" } });
      expect([url, res.headers["x-robots-tag"]]).toEqual([url, NOINDEX]);
    }
  });
});

describe("site: robots.txt and the sitemap without the app", () => {
  let publicDir: string;
  let app: FastifyInstance | null = null;

  beforeEach(() => {
    publicDir = mkdtempSync(join(tmpdir(), "site-seo-site-"));
    writePublic(publicDir);
  });

  afterEach(async () => {
    await app?.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it("uses the request's own origin when no public URL is set, and says 404 when unbuilt", async () => {
    app = Fastify();
    await registerSite(app, { mode: "hosted", publicDir, applyHtmlHeaders });
    const res = await app.inject({ url: "/sitemap.xml", headers: { host: "mosque.test:8443" } });
    expect(res.body).toContain("<loc>http://mosque.test:8443/</loc>");
    expect(
      (await app.inject({ url: "/robots.txt", headers: { host: "mosque.test:8443" } })).body,
    ).toContain("Sitemap: http://mosque.test:8443/sitemap.xml");
    rmSync(join(publicDir, "site", "hosted", "sitemap.xml"));
    expect((await app.inject({ url: "/sitemap.xml" })).statusCode).toBe(404);
  });
});
