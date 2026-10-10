// What the website tells search engines besides its pages (docs/seo.md): the sitemap of the public
// website, with every language version of every page (hreflang, x-default English), and the
// structured data (JSON-LD) of the home pages. Pure: the absolute URLs start with `origin`, which
// the build sets to ORIGIN_TOKEN so that the server fills in its own origin when it serves them.
// The JSON-LD says only what the page says: the name, the free price (Turjuman itself costs
// nothing; Soniox bills the mosque), the MIT licence and the source on GitHub. No ratings.
import { inLang } from "../content/doc.js";
import { DOC_PAGES } from "../content/docs/index.js";
import { SITE_LANGS, type SiteLang } from "../content/khutbah.js";
import { GITHUB_ORG, LICENSE_URL } from "../content/links.js";
import { PAGES, pagePath, type SitePage } from "../content/pages.js";
import { DICTS } from "../content/strings.js";

/** The pages search engines may index: every page of the public website but the 404 page. */
export function indexablePages(): SitePage[] {
  return PAGES.filter((p) => !p.notFound);
}

function xml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * sitemap.xml of the public website (hosted mode): one <url> per page and language, each listing
 * every language version of its page and English as x-default, so the alternates are reciprocal.
 * No <lastmod>: the build cannot know when a page last changed (Google uses lastmod only when it
 * is consistently accurate), and no <priority> or <changefreq> (Google ignores both).
 */
export function sitemapXml(origin: string): string {
  const url = (page: SitePage, lang: SiteLang): string =>
    xml(`${origin}${pagePath("hosted", lang, page.slug)}`);
  const entries = indexablePages().flatMap((page) =>
    SITE_LANGS.map((lang) => {
      const alternates = [
        ...SITE_LANGS.map((l) => [l, url(page, l)] as const),
        ["x-default", url(page, "en")] as const,
      ].map(([l, href]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`);
      return `  <url>\n    <loc>${url(page, lang)}</loc>\n${alternates.join("\n")}\n  </url>`;
    }),
  );
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${entries.join("\n")}\n</urlset>\n`
  );
}

export interface SeoAssets {
  /** The mark as a 180 px PNG: the organisation's logo. */
  touchIcon: string;
}

/** The brand's name in Arabic (the wordmark's ترجمان). */
const NAME_AR = "ترجمان";

/**
 * The structured data of a home page (hosted mode), as one @graph: the organisation, the app in the
 * page's language, and on the English home page at / also the website (its site name: Google reads
 * WebSite only on the domain's root page). Only facts the page shows: Turjuman is free, open source
 * under the MIT licence, its source is on GitHub, and it runs in the browser (the hosted app) or on
 * a computer of your own.
 */
export function homeStructuredData(
  lang: SiteLang,
  origin: string,
  assets: SeoAssets,
): Record<string, unknown> {
  const home = `${origin}/`;
  const page = `${origin}${pagePath("hosted", lang, "")}`;
  const org = `${home}#organization`;
  const d = DICTS[lang];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: "Turjuman",
        alternateName: NAME_AR,
        url: home,
        logo: {
          "@type": "ImageObject",
          url: `${origin}${assets.touchIcon}`,
          width: 180,
          height: 180,
        },
        sameAs: [GITHUB_ORG],
      },
      ...(page === home
        ? [
            {
              "@type": "WebSite",
              "@id": `${home}#website`,
              name: "Turjuman",
              alternateName: NAME_AR,
              url: home,
              inLanguage: [...SITE_LANGS],
              publisher: { "@id": org },
            },
          ]
        : []),
      {
        "@type": "WebApplication",
        "@id": `${page}#app`,
        name: "Turjuman",
        url: page,
        description: d.desc,
        inLanguage: lang,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web browser; self-hosted on macOS, Linux or Windows",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        license: LICENSE_URL,
        publisher: { "@id": org },
      },
    ],
  };
}

/** A JSON-LD data block. It is never run, so the pages' CSP (script-src 'self') does not apply to
 *  it; "<" is escaped so the text can never close the element. */
export function jsonLdScript(data: Record<string, unknown>): string {
  const json = JSON.stringify(data).replaceAll("<", "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Each page's <title> and description in `lang` (the home page's from strings.ts, a text page's
 *  from its own content), for the checks of test/unit/site-seo.test.ts. */
export function pageMeta(page: SitePage, lang: SiteLang): { title: string; desc: string } {
  const doc = DOC_PAGES[page.id];
  if (doc === undefined) return { title: DICTS[lang].title, desc: DICTS[lang].desc };
  return { title: inLang(doc.title, lang), desc: inLang(doc.desc, lang) };
}
