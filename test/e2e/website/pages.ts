// Every page of the website in every language and both modes (and the 404 page in each language),
// on a wide screen and on a phone: it answers, runs without an error, says its language and
// direction, has its title and description, tells search engines the right addresses (hosted) or
// to stay away (local), fits the screen, and every link on it leads somewhere real. One test per
// mode and language walks its ten addresses in two tabs (1440 px and a 390 px phone); every
// finding names the address.
import { describe, type ExpectStatic, test } from "vitest";
import { inLang } from "../../../site/content/doc.js";
import { DOC_PAGES } from "../../../site/content/docs/index.js";
import { APP_PATHS, GITHUB_URL } from "../../../site/content/links.js";
import { pagePath } from "../../../site/content/pages.js";
import { DICTS } from "../../../site/content/strings.js";
import { pageMeta } from "../../../site/render/seo.js";
import {
  OPERATOR,
  openSitePage,
  pathOf,
  SITE_LANGS,
  type Site,
  type SiteLang,
  type SiteMode,
  type SitePageHandle,
  type SiteRoute,
  websiteRoutes,
} from "../helpers/website.js";
import { overflow, type PageFacts, pageFacts, scrollThrough } from "../helpers/website-dom.js";
import { externalProblem, isInternal, LinkFetcher } from "../helpers/website-links.js";

const OG_LOCALES = { en: "en_GB", nl: "nl_NL", ar: "ar_AR" } as const;
const NOINDEX = "noindex, nofollow";

/** One fetch per address for the whole suite (most links are on every page). */
const fetcher = new LinkFetcher();

/** A finding about one address: "<path>: <what>". */
type Say = (what: string) => string;

/** Where a link to page `id` points from `route`: "#top" on the page itself. */
function hrefTo(route: SiteRoute, id: string): string {
  return id === route.page.id ? "#top" : pathOf(route.mode, route.lang, id);
}

function checkHead(
  expect: ExpectStatic,
  say: Say,
  route: SiteRoute,
  facts: PageFacts,
  origin: string,
): void {
  const { mode, lang, page } = route;
  const missing = route.status === 404;
  const meta = pageMeta(page, lang);
  expect.soft(facts.lang, say("<html lang>")).toBe(lang);
  expect.soft(facts.dir, say("<html dir>")).toBe(lang === "ar" ? "rtl" : "ltr");
  expect.soft(facts.pageId, say("data-page")).toBe(page.id);
  expect.soft(facts.title, say("<title>")).toBe(meta.title);
  expect.soft(facts.title.trim(), say("<title> is not empty")).not.toBe("");
  expect.soft(facts.desc, say("meta description")).toBe(meta.desc);
  expect.soft(facts.desc?.trim() ?? "", say("meta description is not empty")).not.toBe("");
  expect.soft(facts.h1, say("one <h1>")).toHaveLength(1);
  expect.soft(facts.h1[0] ?? "", say("the <h1> says something")).not.toBe("");
  const notFound = DOC_PAGES["not-found"];
  if (missing && notFound?.h1 !== undefined) {
    expect.soft(facts.h1[0], say("the 404 page's heading")).toBe(inLang(notFound.h1, lang));
  }
  expect.soft(facts.tokens, say("a server token (__TJ_…) left in the page")).toBe(false);
  const dupes = facts.ids.filter((id, i) => facts.ids.indexOf(id) !== i);
  expect.soft(dupes, say("ids used twice (an anchor could not tell them apart)")).toEqual([]);

  // Search engines: the public website names its addresses; a preview and the 404 page say
  // noindex. In local mode the addresses stay inside the preview (/site/…).
  const self = `${origin}${route.path}`;
  const alternates = [
    ...SITE_LANGS.map((l): [string, string] => [l, `${origin}${pagePath(mode, l, page.slug)}`]),
    ["x-default", `${origin}${pagePath(mode, "en", page.slug)}`],
  ];
  if (missing) {
    expect.soft(facts.canonical, say("no canonical on the 404 page")).toBeNull();
    expect.soft(facts.alternates, say("no hreflang on the 404 page")).toEqual([]);
    expect.soft(facts.og.url, say("no og:url on the 404 page")).toBeUndefined();
  } else {
    expect.soft(facts.canonical, say("canonical")).toBe(self);
    expect.soft(facts.alternates, say("hreflang alternates")).toEqual(alternates);
    expect.soft(facts.og.url, say("og:url")).toBe(self);
  }
  expect
    .soft(facts.robots, say("meta robots"))
    .toBe(mode === "local" || missing ? "noindex" : null);
  expect.soft(facts.og.locale, say("og:locale")).toBe(OG_LOCALES[lang]);
  expect.soft(facts.og.title, say("og:title")).toBe(meta.title);
  expect
    .soft(facts.og.image ?? "", say("og:image"))
    .toMatch(new RegExp(`^${origin}/site-assets/og-${lang}-[0-9a-f]{10}\\.png$`));

  // Structured data: on the public website's home pages only, and it parses.
  const home = mode === "hosted" && page.id === "home";
  expect.soft(facts.jsonLd, say("JSON-LD blocks")).toHaveLength(home ? 1 : 0);
  if (home) {
    const data = JSON.parse(facts.jsonLd[0] ?? "") as {
      "@context": string;
      "@graph": Array<Record<string, unknown>>;
    };
    expect.soft(data["@context"], say("JSON-LD @context")).toBe("https://schema.org");
    const graph = data["@graph"];
    expect
      .soft(
        graph.map((n) => n["@type"]),
        say("JSON-LD @graph"),
      )
      .toEqual(
        lang === "en"
          ? ["Organization", "WebSite", "WebApplication"]
          : ["Organization", "WebApplication"],
      );
    const app = graph.find((n) => n["@type"] === "WebApplication");
    expect.soft(app?.url, say("JSON-LD: the app is this page")).toBe(self);
    expect.soft(app?.inLanguage, say("JSON-LD inLanguage")).toBe(lang);
    expect.soft(app?.isAccessibleForFree, say("JSON-LD: free")).toBe(true);
    expect
      .soft(app?.offers, say("JSON-LD offer"))
      .toEqual({ "@type": "Offer", price: "0", priceCurrency: "EUR" });
    const org = graph.find((n) => n["@type"] === "Organization");
    expect.soft(org?.url, say("JSON-LD organisation")).toBe(`${origin}/`);
    expect
      .soft((org?.logo as { url?: string } | undefined)?.url ?? "", say("JSON-LD logo"))
      .toMatch(new RegExp(`^${origin}/site-assets/touch-icon-[0-9a-f]{10}\\.png$`));
  }

  // The header: the section links, the language switch, log in and start.
  const d = DICTS[lang];
  expect
    .soft(
      facts.links.filter((l) => l.area === "nav.links").map((l) => [l.text, l.raw]),
      say("the nav"),
    )
    .toEqual([
      [d.nav1, hrefTo(route, "how-it-works")],
      [d.nav2, hrefTo(route, "self-host")],
      ["GitHub", GITHUB_URL],
    ]);
  expect
    .soft(
      facts.links.filter((l) => l.area === "nav.langs").map((l) => [l.hreflang, l.raw, l.current]),
      say("the language switch"),
    )
    .toEqual(
      SITE_LANGS.map((l) => [
        l,
        pagePath(mode, l, missing ? "" : page.slug),
        l === lang ? "page" : null,
      ]),
    );
  const start = facts.links.filter((l) => l.text === d.start || l.text === d.cta1);
  expect.soft(start.length, say("Start links (nav, menu, …)")).toBeGreaterThanOrEqual(2);
  for (const l of start) expect.soft(l.raw, say(`"${l.text}"`)).toBe(APP_PATHS[mode].start);
  const login = facts.links.filter((l) => l.text === d.login);
  expect.soft(login.length, say("Log in links (menu, footer)")).toBeGreaterThanOrEqual(2);
  for (const l of login) expect.soft(l.raw, say(`"${l.text}"`)).toBe(APP_PATHS[mode].login);
  // Only a configured hosted server has the operator's footer links (seo.ts).
  for (const url of Object.values(OPERATOR)) {
    expect
      .soft(
        facts.links.map((l) => l.raw),
        say("no operator links"),
      )
      .not.toContain(url);
  }
}

async function checkLinks(
  expect: ExpectStatic,
  say: Say,
  route: SiteRoute,
  facts: PageFacts,
  origin: string,
): Promise<void> {
  const ids = new Set(facts.ids);
  for (const link of facts.links) {
    const where = say(`link "${link.text || link.label}" → ${link.raw}`);
    expect.soft(link.text !== "" || link.label !== null, `${where} has a name`).toBe(true);
    if (link.raw.startsWith("#")) {
      const id = decodeURIComponent(link.raw.slice(1));
      // "#top" is the top of the document (HTML), whether or not an element has that id.
      expect.soft(id === "top" || ids.has(id), `${where}: its target`).toBe(true);
      continue;
    }
    if (!isInternal(link.href, origin)) {
      expect.soft(externalProblem(link.href), where).toBeNull();
      continue;
    }
    const target = await fetcher.get(link.href);
    expect.soft(target.status, where).toBe(200);
    const hash = new URL(link.href).hash.slice(1);
    if (hash !== "") {
      expect
        .soft(hash === "top" || target.ids.has(decodeURIComponent(hash)), `${where}: its target`)
        .toBe(true);
    }
    if (link.area === "nav.langs") {
      // The language switch keeps you on this page (the 404 page's leads to the home pages).
      expect.soft(target.lang, `${where}: language`).toBe(link.hreflang);
      expect
        .soft(target.pageId, `${where}: the same page`)
        .toBe(route.status === 404 ? "home" : route.page.id);
    }
  }
  for (const url of facts.resources) {
    expect.soft((await fetcher.get(url)).status, say(url)).toBe(200);
  }
  if (facts.og.image !== undefined) {
    const res = await fetcher.get(facts.og.image);
    expect.soft([res.status, res.contentType], say(facts.og.image)).toEqual([200, "image/png"]);
  }
}

/** Opens `url` in `tab` and checks its status, and that it fits the tab's width (no sideways
 *  scrolling, nothing sticking out at the sides), also once everything that starts on the way
 *  down has started. Resolves with the response's headers. */
async function fits(
  expect: ExpectStatic,
  say: Say,
  tab: SitePageHandle,
  url: string,
  status: number,
): Promise<Record<string, string>> {
  const width = tab.page.viewportSize()?.width ?? 0;
  const res = await tab.goto(url);
  expect.soft(res.status(), say(`status at ${width} px`)).toBe(status);
  const fit = { scrollWidth: width, offenders: [] };
  expect.soft(await overflow(tab.page), say(`fits ${width} px`)).toMatchObject(fit);
  await scrollThrough(tab.page);
  expect.soft(await overflow(tab.page), say(`fits ${width} px, scrolled`)).toMatchObject(fit);
  return res.headers();
}

export function pagesSuite(site: () => Site): void {
  const cases = (["hosted", "local"] as const satisfies readonly SiteMode[]).flatMap((mode) =>
    SITE_LANGS.map((lang) => [mode, lang] as [SiteMode, SiteLang]),
  );
  describe.concurrent("every page, in every language and mode, on a wide screen and a phone", () => {
    test.for(cases)("%s website in %s", async ([mode, lang], { expect }) => {
      const origin = site().server(mode).url;
      const [wide, phone] = await Promise.all([
        openSitePage(site().browser),
        openSitePage(site().browser, { mobile: true }),
      ]);
      try {
        for (const route of websiteRoutes(mode).filter((r) => r.lang === lang)) {
          const say: Say = (what) => `${route.path}: ${what}`;
          const url = `${origin}${route.path}`;
          const [headers] = await Promise.all([
            fits(expect, say, wide, url, route.status),
            fits(expect, say, phone, url, route.status),
          ]);
          expect.soft(headers["content-type"], say("type")).toBe("text/html; charset=utf-8");
          expect
            .soft(headers["x-robots-tag"], say("X-Robots-Tag"))
            .toBe(mode === "local" || route.status === 404 ? NOINDEX : undefined);
          expect
            .soft(headers["content-security-policy"] ?? "", say("CSP"))
            .toContain("script-src 'self';");
          expect.soft(headers["x-frame-options"], say("X-Frame-Options")).toBe("DENY");

          const facts = await pageFacts(wide.page);
          checkHead(expect, say, route, facts, origin);
          await checkLinks(expect, say, route, facts, origin);
          expect.soft(wide.takeProblems(), say("problems at 1440 px")).toEqual([]);
          expect.soft(phone.takeProblems(), say("problems on a phone")).toEqual([]);
        }
      } finally {
        await Promise.all([wide.close(), phone.close()]);
      }
    });
  });
}
