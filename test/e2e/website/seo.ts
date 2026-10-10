// What search engines and a mistyped address meet (docs/seo.md): robots.txt, the sitemap (read by
// Chrome's XML parser, every address in it fetched), X-Robots-Tag on everything that is not the
// public website, real 404s with the website's 404 page in the address's language, one address
// per page, the website's files, and a hosted server that names its public URL and its
// operator's privacy statement and contact.
import { describe, test } from "vitest";
import { inLang } from "../../../site/content/doc.js";
import { DOC_PAGES } from "../../../site/content/docs/index.js";
import { pagePath } from "../../../site/content/pages.js";
import { DICTS } from "../../../site/content/strings.js";
import {
  inPage,
  MISSING_SLUG,
  OPERATOR,
  openSitePage,
  pathOf,
  SITE_LANGS,
  type Site,
  type SiteLang,
  websiteRoutes,
} from "../helpers/website.js";
import { pageFacts } from "../helpers/website-dom.js";
import { LinkFetcher } from "../helpers/website-links.js";

const NOINDEX = "noindex, nofollow";

interface Answer {
  status: number;
  type: string;
  xRobotsTag: string | null;
  cacheControl: string | null;
  location: string | null;
  body: string;
}

async function get(url: string, init: { method?: string; accept?: string } = {}): Promise<Answer> {
  const res = await fetch(url, {
    method: init.method ?? "GET",
    redirect: "manual",
    headers: { accept: init.accept ?? "text/html,application/xhtml+xml,*/*;q=0.8" },
  });
  return {
    status: res.status,
    type: res.headers.get("content-type") ?? "",
    xRobotsTag: res.headers.get("x-robots-tag"),
    cacheControl: res.headers.get("cache-control"),
    location: res.headers.get("location"),
    body: await res.text(),
  };
}

interface SitemapUrl {
  loc: string;
  alternates: Array<[string, string]>;
}

/** The sitemap read by Chrome's XML parser: null when it is not well-formed. */
async function parseSitemap(site: Site, xml: string): Promise<SitemapUrl[] | null> {
  const tab = await openSitePage(site.browser);
  try {
    return await inPage<SitemapUrl[] | null>(
      tab.page,
      `(xml) => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        if (doc.getElementsByTagName("parsererror").length > 0) return null;
        const root = doc.documentElement;
        if (root.localName !== "urlset" || root.namespaceURI !== "http://www.sitemaps.org/schemas/sitemap/0.9") return null;
        return [...root.children].map((u) => ({
          loc: u.getElementsByTagNameNS("http://www.sitemaps.org/schemas/sitemap/0.9", "loc")[0]?.textContent ?? "",
          alternates: [...u.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link")].map((l) => [
            l.getAttribute("hreflang"),
            l.getAttribute("href"),
          ]),
        }));
      }`,
      xml,
    );
  } finally {
    await tab.close();
  }
}

/** The website's stylesheet, a font and the Open Graph picture of the English home page. */
async function assetPaths(origin: string): Promise<string[]> {
  const html = (await get(`${origin}${pathOf("hosted", "en", "home")}`)).body;
  const css = /<link rel="stylesheet" href="([^"]+)">/.exec(html)?.[1];
  const font = /<link rel="preload" href="([^"]+)"/.exec(html)?.[1];
  const og = /<meta property="og:image" content="[^"]*(\/site-assets\/[^"]+)">/.exec(html)?.[1];
  if (css === undefined || font === undefined || og === undefined) {
    throw new Error("the home page names no stylesheet, font or picture");
  }
  return [css, font, og];
}

export function seoSuite(site: () => Site): void {
  describe.concurrent("what search engines and mistyped addresses meet", () => {
    test("robots.txt lets crawlers into the public website and names its sitemap; a self-hosted server keeps them out", async ({
      expect,
    }) => {
      const { hosted, configured, local } = site().servers;
      for (const [origin, sitemap] of [
        [hosted.url, `${hosted.url}/sitemap.xml`],
        [configured.url, `${OPERATOR.publicUrl}/sitemap.xml`],
      ]) {
        const robots = await get(`${origin}/robots.txt`);
        expect([robots.status, robots.type, robots.xRobotsTag]).toEqual([
          200,
          "text/plain; charset=utf-8",
          null,
        ]);
        const lines = robots.body.split("\n");
        expect(lines).toContain("User-agent: *");
        expect(lines).toContain("Allow: /");
        expect(lines).toContain(`Sitemap: ${sitemap}`);
        expect(robots.body).not.toMatch(/Disallow/);
      }
      const closed = await get(`${local.url}/robots.txt`);
      expect([closed.status, closed.xRobotsTag]).toEqual([200, NOINDEX]);
      expect(closed.body.split("\n")).toEqual(
        expect.arrayContaining(["User-agent: *", "Disallow: /"]),
      );
      expect(closed.body).not.toMatch(/Sitemap|Allow: \//);
    });

    test("the sitemap lists every page in every language with its alternates, and each address answers with that canonical", async ({
      expect,
    }) => {
      const fetcher = new LinkFetcher();
      for (const [server, base] of [
        [site().servers.hosted, site().servers.hosted.url],
        [site().servers.configured, OPERATOR.publicUrl],
      ] as const) {
        const res = await get(`${server.url}/sitemap.xml`);
        expect([res.status, res.type, res.xRobotsTag], base).toEqual([
          200,
          "application/xml; charset=utf-8",
          null,
        ]);
        const urls = await parseSitemap(site(), res.body);
        expect(urls, `${base}: well-formed XML, a sitemaps.org urlset`).not.toBeNull();
        const routes = websiteRoutes("hosted").filter((r) => r.status === 200);
        expect(urls?.map((u) => u.loc).sort()).toEqual(
          routes.map((r) => `${base}${r.path}`).sort(),
        );
        for (const route of routes) {
          const entry = urls?.find((u) => u.loc === `${base}${route.path}`);
          const alternates = [
            ...SITE_LANGS.map((l) => [l, `${base}${pagePath("hosted", l, route.page.slug)}`]),
            ["x-default", `${base}${pagePath("hosted", "en", route.page.slug)}`],
          ];
          expect(entry?.alternates, `${route.path}: alternates`).toEqual(alternates);
          // The page itself, on this server, says the same.
          const page = await fetcher.get(`${server.url}${route.path}`);
          expect(
            [page.status, page.xRobotsTag, page.robots, page.canonical, page.alternates],
            route.path,
          ).toEqual([200, null, null, entry?.loc, alternates]);
        }
        // Every page has a title and a description of its own, in each language.
        for (const lang of SITE_LANGS) {
          const pages = await Promise.all(
            routes.filter((r) => r.lang === lang).map((r) => fetcher.get(`${server.url}${r.path}`)),
          );
          const titles = pages.map((p) => p.title);
          const descs = pages.map((p) => p.desc);
          expect(new Set(titles).size, `${lang}: titles ${JSON.stringify(titles)}`).toBe(
            pages.length,
          );
          expect(new Set(descs).size, `${lang}: descriptions`).toBe(pages.length);
        }
      }
      const none = await get(`${site().servers.local.url}/sitemap.xml`);
      expect([none.status, none.xRobotsTag], "a self-hosted server has no sitemap").toEqual([
        404,
        NOINDEX,
      ]);
    });

    test("X-Robots-Tag: the public website may be indexed; the app, every error and a self-hosted server may not", async ({
      expect,
    }) => {
      const { hosted, local } = site().servers;
      const assets = await assetPaths(hosted.url);
      const website = [
        "/",
        "/nl",
        "/ar/install",
        "/commands",
        "/robots.txt",
        "/sitemap.xml",
        "/nl/",
        ...assets,
      ];
      for (const path of website) {
        const res = await get(`${hosted.url}${path}`);
        expect([res.status < 400, res.xRobotsTag], path).toEqual([true, null]);
      }
      const app = [
        "/signup",
        "/login",
        "/app",
        "/app/new",
        "/app/look",
        "/app/keys",
        "/admin",
        "/customize",
        "/overlay",
        "/control",
        "/health",
        "/api/auth/me",
        "/ar/nl",
        "/s/no-such-session",
        "/feed/no-such-feed",
        "/favicon.ico",
        "/api/no-such-thing",
        `/${MISSING_SLUG}`,
        `/nl/${MISSING_SLUG}`,
      ];
      for (const path of app) {
        expect((await get(`${hosted.url}${path}`)).xRobotsTag, path).toBe(NOINDEX);
      }
      for (const path of [
        "/",
        "/site",
        "/site/nl/install",
        "/site/ar/",
        "/robots.txt",
        "/app/new",
        ...assets,
      ]) {
        expect((await get(`${local.url}${path}`)).xRobotsTag, `local ${path}`).toBe(NOINDEX);
      }
    });

    test("an unknown page answers 404 with the website's 404 page in its language; what is not a page gets a plain 404", async ({
      expect,
    }) => {
      const { hosted, local } = site().servers;
      const notFound = DOC_PAGES["not-found"];
      const cases: Array<[string, string, SiteLang]> = [
        [hosted.url, `/${MISSING_SLUG}?from=a-link`, "en"],
        [hosted.url, "/nl/no/such/deep/page", "nl"],
        // A mistyped page under a language is not taken for a caption page (/:from/:to).
        [hosted.url, "/nl/instal", "nl"],
        [hosted.url, "/ar/securty", "ar"],
        [local.url, "/site/no/such/page", "en"],
        [local.url, "/site/ar/instal", "ar"],
      ];
      for (const [origin, path, lang] of cases) {
        const res = await get(`${origin}${path}`);
        expect([res.status, res.type, res.xRobotsTag], path).toEqual([
          404,
          "text/html; charset=utf-8",
          NOINDEX,
        ]);
        expect(res.body, path).toContain(
          `<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`,
        );
        expect(res.body, path).toContain('<body data-page="not-found">');
        expect(res.body, path).toContain('<meta name="robots" content="noindex">');
        expect(res.body, path).not.toContain('rel="canonical"');
        if (notFound?.h1 !== undefined) expect(res.body, path).toContain(inLang(notFound.h1, lang));
      }
      // HEAD is answered like GET.
      const head = await get(`${hosted.url}/nl/${MISSING_SLUG}`, { method: "HEAD" });
      expect([head.status, head.type, head.body]).toEqual([404, "text/html; charset=utf-8", ""]);
      // Not a page: a script or an API asking, the app's own addresses, and outside the preview.
      for (const [origin, path, accept] of [
        [hosted.url, `/${MISSING_SLUG}`, "application/json"],
        [hosted.url, "/api/no-such-thing", undefined],
        [hosted.url, "/site/install", undefined],
        [local.url, `/${MISSING_SLUG}`, undefined],
      ] as const) {
        const res = await get(`${origin}${path}`, accept === undefined ? {} : { accept });
        expect([res.status, res.type, res.body], path).toEqual([
          404,
          "text/plain; charset=utf-8",
          "Not found\n",
        ]);
      }
      // Caption pages keep their addresses next to the website's.
      for (const path of ["/ar/nl", "/nl/en"]) {
        const res = await get(`${hosted.url}${path}`);
        expect(res.status, path).toBe(200);
        expect(res.body, path).not.toContain("data-page=");
      }
      // And in a browser, the 404 page runs cleanly and its language switch leads home.
      const tab = await openSitePage(site().browser);
      try {
        const res = await tab.goto(`${hosted.url}/ar/no/such/page`);
        expect(res.status()).toBe(404);
        const facts = await pageFacts(tab.page);
        expect(facts.links.filter((l) => l.area === "nav.langs").map((l) => l.raw)).toEqual(
          SITE_LANGS.map((l) => pathOf("hosted", l, "home")),
        );
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("every page has one address: a trailing slash redirects to it, keeping the query", async ({
      expect,
    }) => {
      const { hosted, local } = site().servers;
      for (const [origin, from, to] of [
        [hosted.url, "/nl/", "/nl"],
        [hosted.url, "/install/?ref=a", "/install?ref=a"],
        [hosted.url, "/ar/commands/", "/ar/commands"],
        [local.url, "/site/", "/site"],
        [local.url, "/site/nl/docker/", "/site/nl/docker"],
      ] as const) {
        const res = await get(`${origin}${from}`);
        expect([res.status, res.location], from).toEqual([301, to]);
      }
    });

    test("the website's files are cached for good, under names that change with their content", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      for (const path of await assetPaths(origin)) {
        expect(path).toMatch(/^\/site-assets\/[\w-]+-[\w]{8,10}\.(css|woff2|png)$/);
        const res = await get(`${origin}${path}`);
        expect([res.status, res.cacheControl], path).toEqual([
          200,
          "public, max-age=31536000, immutable",
        ]);
        expect(res.type, path).toMatch(/^(text\/css|font\/woff2|image\/png)/);
      }
      const missing = await get(`${origin}/site-assets/no-such-file.css`);
      expect(missing.status).toBe(404);
      expect(missing.body).not.toContain("<html");
    });

    test("a hosted server with a public URL and its operator's links: absolute addresses use that URL, and the footer links to its privacy statement and contact", async ({
      expect,
    }) => {
      const { configured } = site().servers;
      const base = OPERATOR.publicUrl;
      const tab = await openSitePage(site().browser);
      try {
        for (const lang of SITE_LANGS) {
          for (const id of ["home", "network"]) {
            const path = pathOf("hosted", lang, id);
            await tab.goto(`${configured.url}${path}`);
            const facts = await pageFacts(tab.page);
            const where = `${lang} ${id}`;
            expect(facts.canonical, where).toBe(`${base}${path}`);
            expect(facts.og.url, where).toBe(`${base}${path}`);
            expect(facts.og.image ?? "", where).toMatch(
              new RegExp(`^${base}/site-assets/og-${lang}-`),
            );
            expect(
              facts.alternates.every(([, href]) => href.startsWith(`${base}/`)),
              where,
            ).toBe(true);
            const footer = facts.links.filter((l) => l.area === "footer.wrap");
            expect(
              footer
                .filter((l) => l.raw === OPERATOR.privacyUrl || l.raw === OPERATOR.contactUrl)
                .map((l) => [l.text, l.raw]),
              where,
            ).toEqual([
              [DICTS[lang].privacy, OPERATOR.privacyUrl],
              [DICTS[lang].contact, OPERATOR.contactUrl],
            ]);
            if (id === "home") {
              const graph = (JSON.parse(facts.jsonLd[0] ?? "{}") as { "@graph"?: unknown[] })[
                "@graph"
              ];
              const urls = JSON.stringify(graph).match(/https?:\/\/[^"]+/g) ?? [];
              expect(
                urls.filter(
                  (u) =>
                    !u.startsWith(`${base}/`) &&
                    !u.startsWith("https://schema.org") &&
                    !u.startsWith("https://github.com/"),
                ),
                where,
              ).toEqual([]);
            }
          }
        }
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });
  });
}
