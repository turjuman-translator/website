import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { pino } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_LANGS } from "../../site/content/khutbah.js";
import { PAGES, pagePath } from "../../site/content/pages.js";
import { ORIGIN_TOKEN as BUILD_TOKEN } from "../../site/render/page.js";
import { SigningSecret } from "../../src/accounts/secret.js";
import { loadConfig } from "../../src/config.js";
import type { SessionManagerApi } from "../../src/core/contracts.js";
import { buildApp, RESERVED_SEGMENTS } from "../../src/server/app.js";
import { applyHtmlHeaders } from "../../src/server/security.js";
import {
  fillOperatorLinks,
  looksLikeSitePage,
  notFoundLang,
  OPERATOR_TOKENS,
  ORIGIN_TOKEN,
  parseRoutes,
  registerSite,
  type SiteOptions,
  siteOrigin,
  siteRoutes,
} from "../../src/server/site.js";
import type { AppMode } from "../../src/shared/protocol.js";

/** A built site with the home page and a "self-host" page, in both modes. */
function writeSite(publicDir: string): void {
  mkdirSync(join(publicDir, "site", "assets"), { recursive: true });
  for (const mode of ["hosted", "local"] as const) {
    const routes: Record<string, string> = {};
    for (const lang of SITE_LANGS) {
      mkdirSync(join(publicDir, "site", mode, lang), { recursive: true });
      for (const [id, slug] of [
        ["home", ""],
        ["self-host", "self-host"],
      ] as const) {
        writeFileSync(
          join(publicDir, "site", mode, lang, `${id}.html`),
          `<!doctype html><title>${mode} ${lang} ${id}</title>` +
            `<link rel="canonical" href="${ORIGIN_TOKEN}${pagePath(mode, lang, slug)}">` +
            (mode === "hosted"
              ? `<div class="fl"><a href="${OPERATOR_TOKENS.privacy}" data-op="privacy">Privacy</a>` +
                `<a href="${OPERATOR_TOKENS.contact}" data-op="contact">Contact</a></div>`
              : ""),
        );
        routes[pagePath(mode, lang, slug)] = `${lang}/${id}.html`;
      }
      // the 404 page has no route of its own
      writeFileSync(
        join(publicDir, "site", mode, lang, "not-found.html"),
        `<!doctype html><title>${mode} ${lang} not found</title>`,
      );
    }
    writeFileSync(join(publicDir, "site", mode, "routes.json"), JSON.stringify({ routes }));
  }
  writeFileSync(join(publicDir, "site", "assets", "site-ABC.css"), "body{margin:0}");
}

describe("site: routes", () => {
  let publicDir: string;
  let app: FastifyInstance | null = null;

  beforeEach(() => {
    publicDir = mkdtempSync(join(tmpdir(), "site-routes-"));
    writeSite(publicDir);
  });

  afterEach(async () => {
    await app?.close();
    app = null;
    rmSync(publicDir, { recursive: true, force: true });
  });

  async function serve(
    mode: AppMode,
    publicUrl: string | null = null,
    more: Partial<SiteOptions> = {},
  ): Promise<FastifyInstance> {
    const a = Fastify();
    app = a;
    await registerSite(a, { mode, publicDir, applyHtmlHeaders, publicUrl, ...more });
    // as src/server/app.ts does: the website's 404 first, else plain text
    a.setNotFoundHandler(async (req, reply) => {
      if (await a.siteNotFound(req, reply)) return reply;
      return reply.code(404).type("text/plain; charset=utf-8").send("Not found\n");
    });
    await a.ready();
    return a;
  }

  const HTML = { accept: "text/html,application/xhtml+xml" };

  it("serves every page at its path in hosted mode, with the strict headers", async () => {
    const a = await serve("hosted");
    for (const [url, title] of [
      ["/", "hosted en home"],
      ["/nl", "hosted nl home"],
      ["/ar", "hosted ar home"],
      ["/self-host", "hosted en self-host"],
      ["/nl/self-host", "hosted nl self-host"],
      ["/ar/self-host", "hosted ar self-host"],
    ]) {
      const res = await a.inject({ url, headers: { host: "turjuman.test" } });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain(`<title>${title}</title>`);
      expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
      const csp = String(res.headers["content-security-policy"]);
      for (const directive of [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
      ]) {
        expect(csp).toContain(directive);
      }
      expect(res.headers["x-frame-options"]).toBe("DENY");
    }
    expect((await a.inject({ url: "/site" })).statusCode).toBe(404);
    expect((await a.inject({ url: "/site/self-host" })).statusCode).toBe(404);
  });

  it("previews the local build under /site in local mode", async () => {
    const a = await serve("local");
    for (const [url, title] of [
      ["/site", "local en home"],
      ["/site/nl", "local nl home"],
      ["/site/ar", "local ar home"],
      ["/site/self-host", "local en self-host"],
      ["/site/ar/self-host", "local ar self-host"],
    ]) {
      expect((await a.inject({ url })).body).toContain(`<title>${title}</title>`);
    }
    expect((await a.inject({ url: "/nl" })).statusCode).toBe(404);
    expect((await a.inject({ url: "/self-host" })).statusCode).toBe(404);
  });

  it("fills in the origin of absolute URLs: the public URL, else the request's", async () => {
    const a = await serve("hosted");
    const res = await a.inject({ url: "/nl", headers: { host: "Turjuman.test:8443" } });
    expect(res.body).toContain('<link rel="canonical" href="http://turjuman.test:8443/nl">');
    expect(res.body).not.toContain(ORIGIN_TOKEN);
    await a.close();
    const b = await serve("hosted", "https://turjuman.org/");
    const res2 = await b.inject({ url: "/ar/self-host", headers: { host: "10.0.0.5" } });
    expect(res2.body).toContain('<link rel="canonical" href="https://turjuman.org/ar/self-host">');
  });

  it("works out the origin safely", () => {
    expect(siteOrigin("https://turjuman.org/path", "http", "x")).toBe("https://turjuman.org");
    expect(siteOrigin(null, "https", "mosque.example")).toBe("https://mosque.example");
    expect(siteOrigin("not a url", "http", "a.test:80")).toBe("http://a.test:80");
    // A host that could break out of an attribute is not used.
    expect(siteOrigin(null, "http", 'evil.test"><script>')).toBe("");
    expect(siteOrigin(null, "http", undefined)).toBe("");
  });

  it("takes only well-formed routes and files from the build's routes.json", () => {
    const routes = parseRoutes(
      JSON.stringify({
        routes: {
          "/": "en/home.html",
          "/nl/self-host": "nl/self-host.html",
          "/../etc": "en/home.html",
          "/x": "../secret.html",
          "/Y": "en/home.html",
          "/z": 3,
        },
      }),
    );
    expect([...routes]).toEqual([
      ["/", "en/home.html"],
      ["/nl/self-host", "nl/self-host.html"],
    ]);
    expect(parseRoutes("not json").size).toBe(0);
  });

  it("sends a trailing slash to the page's one address", async () => {
    const a = await serve("hosted");
    const res = await a.inject({ url: "/nl/?x=1" });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe("/nl?x=1");
    expect((await a.inject({ url: "/ar/self-host/" })).headers.location).toBe("/ar/self-host");
  });

  it("does the same for the local preview", async () => {
    const a = await serve("local");
    expect((await a.inject({ url: "/site/" })).headers.location).toBe("/site");
    expect((await a.inject({ url: "/site/nl/self-host/" })).headers.location).toBe(
      "/site/nl/self-host",
    );
  });

  it("serves the hashed assets for a year at /site-assets/", async () => {
    const a = await serve("hosted");
    const res = await a.inject({ url: "/site-assets/site-ABC.css" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect((await a.inject({ url: "/site-assets/missing.js" })).statusCode).toBe(404);
  });

  it("says so when the website has not been built", async () => {
    rmSync(join(publicDir, "site"), { recursive: true, force: true });
    const a = await serve("hosted");
    const res = await a.inject({ url: "/" });
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("pnpm build:site");
  });

  it("fills in the operator's privacy and contact links, or leaves them out", async () => {
    const a = await serve("hosted", null, { privacyUrl: "https://mosque.example/privacy?a=1&b=2" });
    const body = (await a.inject({ url: "/nl" })).body;
    expect(body).toContain(
      '<a href="https://mosque.example/privacy?a=1&amp;b=2" data-op="privacy">',
    );
    expect(body).not.toContain('data-op="contact"');
    expect(body).not.toContain("__TJ_");
    expect(
      fillOperatorLinks(`<a href="${OPERATOR_TOKENS.contact}" data-op="contact">Contact</a>`, {
        contactUrl: "mailto:imam@mosque.example",
      }),
    ).toBe('<a href="mailto:imam@mosque.example" data-op="contact">Contact</a>');
  });

  it("answers a missing page with the website's 404, in the address's language", async () => {
    const a = await serve("hosted");
    const en = await a.inject({ url: "/nope", headers: HTML });
    expect(en.statusCode).toBe(404);
    expect(en.body).toContain("<title>hosted en not found</title>");
    expect(en.headers["content-security-policy"]).toBeDefined();
    expect((await a.inject({ url: "/ar/nope/deeper", headers: HTML })).body).toContain(
      "<title>hosted ar not found</title>",
    );
    // the app's own addresses, and requests that do not want a page, stay as they were
    for (const url of ["/api/nope", "/assets/x.js", "/feed/a/b", "/site/install"]) {
      const res = await a.inject({ url, headers: HTML });
      expect([url, res.statusCode, res.body]).toEqual([url, 404, "Not found\n"]);
    }
    expect((await a.inject({ url: "/nope", headers: { accept: "*/*" } })).body).toBe("Not found\n");
    expect((await a.inject({ method: "POST", url: "/nope", headers: HTML })).body).toBe(
      "Not found\n",
    );
  });

  it("answers every unknown address under /site with the 404 in local mode", async () => {
    const a = await serve("local");
    for (const [url, lang] of [
      ["/site/nope", "en"],
      ["/site/nl/nope", "nl"],
      ["/site/ar/a/b", "ar"],
    ]) {
      const res = await a.inject({ url, headers: HTML });
      expect([url, res.statusCode]).toEqual([url, 404]);
      expect(res.body).toContain(`<title>local ${lang} not found</title>`);
    }
    expect((await a.inject({ url: "/site/install/x" })).statusCode).toBe(404);
    expect((await a.inject({ url: "/nope", headers: HTML })).body).toBe("Not found\n");
  });

  it("tells a mistyped page under a language from a caption pair", () => {
    expect(looksLikeSitePage("nl", "selfhost")).toBe(true);
    expect(looksLikeSitePage("ar", "how-it-work")).toBe(true);
    expect(looksLikeSitePage("nl", "en")).toBe(false);
    expect(looksLikeSitePage("nl", "fil")).toBe(false);
    expect(looksLikeSitePage("en", "selfhost")).toBe(false);
    expect(notFoundLang("hosted", "/nl/x?y=1")).toBe("nl");
    expect(notFoundLang("local", "/site/ar/x")).toBe("ar");
    expect(notFoundLang("hosted", "/xyz")).toBe("en");
  });

  it("routes the home page where the build puts it, with the build's origin token", () => {
    for (const mode of ["hosted", "local"] as const) {
      for (const [route, lang] of siteRoutes(mode)) expect(route).toBe(pagePath(mode, lang, ""));
    }
    expect(ORIGIN_TOKEN).toBe(BUILD_TOKEN);
  });

  it("never gives a page a slug the app uses as a first path segment", () => {
    const taken = new Set([...RESERVED_SEGMENTS, "feed", "ca.crt", "site", ...SITE_LANGS]);
    for (const page of PAGES) expect(taken.has(page.slug)).toBe(false);
  });
});

describe("site: pages next to the caption route (/:from/:to)", () => {
  let root: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), "site-app-"));
    const publicDir = join(root, "public");
    for (const dir of ["assets", "fonts"]) mkdirSync(join(publicDir, dir), { recursive: true });
    writeFileSync(join(publicDir, "caption.html"), "<!doctype html><title>caption page</title>");
    writeSite(publicDir);
    writeFileSync(
      join(root, "config.yaml"),
      `mode: hosted\nlanguagesFile: ${join(process.cwd(), "languages.yaml")}\n`,
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
      publicDir,
      version: "test",
      secret: new SigningSecret(loaded.paths.secretFile, ""),
    });
  });

  afterEach(async () => {
    await app?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it("answers a mistyped /nl/<page> with the Dutch 404, and keeps every caption pair", async () => {
    const typo = await app.inject({ url: "/nl/selfhost", headers: { accept: "text/html" } });
    expect(typo.statusCode).toBe(404);
    expect(typo.body).toContain("<title>hosted nl not found</title>");
    for (const url of ["/nl/en", "/ar/nl"]) {
      expect((await app.inject({ url })).body).toContain("<title>caption page</title>");
    }
    // a pair that is not a page address keeps going to the app with its error
    const pair = await app.inject({ url: "/xx/nl" });
    expect(pair.statusCode).toBe(302);
    expect(pair.headers.location).toMatch(/^\/app\/new\?error=/);
    const one = await app.inject({ url: "/no-such-page", headers: { accept: "text/html" } });
    expect([one.statusCode, one.body]).toEqual([
      404,
      expect.stringContaining("hosted en not found"),
    ]);
    expect((await app.inject({ url: "/api/no-such-thing" })).statusCode).toBe(404);
  });

  it("serves /nl/self-host as a website page, and /ar/nl still as a caption page", async () => {
    const page = await app.inject({ url: "/nl/self-host", headers: { host: "127.0.0.1" } });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain("<title>hosted nl self-host</title>");
    const caption = await app.inject({ url: "/ar/nl", headers: { host: "127.0.0.1" } });
    expect(caption.statusCode).toBe(200);
    expect(caption.body).toContain("<title>caption page</title>");
    const home = await app.inject({ url: "/ar", headers: { host: "127.0.0.1" } });
    expect(home.body).toContain("<title>hosted ar home</title>");
  });
});
