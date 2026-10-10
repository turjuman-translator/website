// Renders one page of the website in one language at build time: site/layout.html (the head, the
// header with the nav, the language switch and the phone menu, the footer) around
// site/pages/<template>.html. Pure: the templates, the data and the asset URLs come in, the HTML
// goes out. Placeholders are {{name}}; every value is HTML (dictionary text is escaped on the way
// in) and an unknown placeholder fails the build.
// What only the server knows is left as a token that src/server/site.ts fills in when it serves
// the page: ORIGIN_TOKEN starts the absolute URLs (hreflang, canonical, Open Graph, JSON-LD), and the
// operator's privacy statement and contact (hosted.privacyUrl, hosted.contactUrl) are footer links
// it fills in, or takes out when they are not set.
import { wordmarkHtml } from "../../web/shared/brand.js";
import { inLang } from "../content/doc.js";
import { DOC_PAGES } from "../content/docs/index.js";
import { SECURITY_REPORT } from "../content/docs/shared.js";
import { headlineFor, SITE_LANGS, type SiteLang } from "../content/khutbah.js";
import {
  APP_PATHS,
  GITHUB_URL,
  LICENSE_URL,
  SELF_HOST_REPO,
  type SiteMode,
} from "../content/links.js";
import { PAGE_WORDS, PAGES, pagePath, SELF_HOST_SECTION, type SitePage } from "../content/pages.js";
import { DICTS, type SiteKey } from "../content/strings.js";
import { type DocContext, docFragments } from "./doc.js";
import { homeFragments } from "./home.js";
import { escapeHtml, fillTemplate, mergeValues } from "./html.js";
import { homeStructuredData, jsonLdScript } from "./seo.js";

export { presetName } from "./home.js";
export { escapeHtml, fillTemplate } from "./html.js";

/** Where the server puts the origin (https://host) of absolute URLs. */
export const ORIGIN_TOKEN = "__TJ_ORIGIN__";
/** Where the server puts hosted.privacyUrl and hosted.contactUrl (or takes the link out). */
export const OPERATOR_TOKENS = { privacy: "__TJ_PRIVACY__", contact: "__TJ_CONTACT__" } as const;

export interface PageAssets {
  /** The script of each kind of page (SitePage.script). */
  scripts: Readonly<Record<SitePage["script"], string>>;
  style: string;
  /** The app tile as an SVG icon and as a 192 px PNG (Google Search shows PNG favicons, not
   *  SVG), and the mark as a 180 px PNG for home screens. */
  icon: string;
  iconPng: string;
  touchIcon: string;
  /** The Open Graph picture of each language. */
  og: Readonly<Record<SiteLang, string>>;
  /** Fonts the first screen needs (preloaded). */
  fonts: readonly string[];
}

export interface Templates {
  layout: string;
  /** site/pages/<template>.html by template name. */
  pages: Readonly<Record<string, string>>;
}

/** What the build reads besides the templates: the languages of the grid (languages.yaml). */
export interface SiteData {
  languages: readonly { code: string; native: string }[];
}

/** A link of the nav or the footer: to a page (and a place on it), the app, or another site. */
export type Target =
  | { page: string; hash?: string }
  | { app: "start" | "login" }
  | { href: string };
export interface NavLink {
  text: SiteKey | { literal: string };
  to: Target;
  /** The pages of its section: on them the link is marked as the current section. */
  section?: ReadonlySet<string>;
}

const NAV: readonly NavLink[] = [
  { text: "nav1", to: { page: "how-it-works" } },
  { text: "nav2", to: { page: "self-host" }, section: SELF_HOST_SECTION },
  { text: { literal: "GitHub" }, to: { href: GITHUB_URL } },
];
const MENU: readonly NavLink[] = [...NAV, { text: "login", to: { app: "login" } }];
const FOOT_GROUPS: ReadonlyArray<[SiteKey | { literal: string }, readonly NavLink[]]> = [
  [
    { literal: "Turjuman" },
    [
      { text: "nav1", to: { page: "how-it-works" } },
      { text: "pg_screen", to: { page: "show-on-a-screen" } },
      { text: "pg_security", to: { page: "security" } },
    ],
  ],
  [
    "nav2",
    [
      { text: "pg_self", to: { page: "self-host" } },
      { text: "pg_install", to: { page: "install" } },
      { text: "pg_network", to: { page: "network" } },
      { text: "pg_docker", to: { page: "docker" } },
      { text: "pg_commands", to: { page: "commands" } },
    ],
  ],
];
const FOOT_LINKS: readonly NavLink[] = [
  { text: { literal: "GitHub" }, to: { href: GITHUB_URL } },
  { text: { literal: "CLI" }, to: { href: SELF_HOST_REPO } },
  { text: "f1", to: { href: LICENSE_URL } },
  { text: "reportSec", to: { href: SECURITY_REPORT } },
];

const OG_LOCALES: Readonly<Record<SiteLang, string>> = { en: "en_GB", nl: "nl_NL", ar: "ar_AR" };
const LANG_SWITCH: ReadonlyArray<[SiteLang, string, string]> = [
  ["en", "English", "EN"],
  ["nl", "Nederlands", "NL"],
  ["ar", "العربية", "عربي"],
];

export interface Here {
  page: SitePage;
  lang: SiteLang;
  mode: SiteMode;
}

function pageOf(id: string): SitePage {
  const p = PAGES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`site: a link points to the unknown page "${id}"`);
  return p;
}

/** Where `to` leads from the page `here` (a place on the same page is just its #hash). */
export function targetHref(to: Target, here: Here): string {
  if ("href" in to) return to.href;
  if ("app" in to) return APP_PATHS[here.mode][to.app];
  if (to.page === here.page.id) return to.hash === undefined ? "#top" : `#${to.hash}`;
  const path = pagePath(here.mode, here.lang, pageOf(to.page).slug);
  return to.hash === undefined ? path : `${path}#${to.hash}`;
}

/** A link target written in the text pages ("page:install#keys", "app:start", "#make", URL). */
export function resolveTarget(target: string, here: Here): string {
  if (target.startsWith("page:")) {
    const [page = "", hash] = target.slice(5).split("#");
    return targetHref(hash === undefined ? { page } : { page, hash }, here);
  }
  if (target === "app:start" || target === "app:login") {
    return targetHref({ app: target.slice(4) as "start" | "login" }, here);
  }
  if (target.startsWith("#") || /^https:\/\//.test(target)) return target;
  throw new Error(`site: unknown link target "${target}"`);
}

function linkText(text: NavLink["text"], lang: SiteLang): string {
  return typeof text === "string" ? DICTS[lang][text] : text.literal;
}

/** Links of the nav or the footer: the page you are on is marked aria-current="page", and a
 *  section you are in aria-current="true". */
export function navHtml(items: readonly NavLink[], here: Here, wrap = ""): string {
  return items
    .map((item) => {
      const onPage =
        "page" in item.to && item.to.page === here.page.id && item.to.hash === undefined;
      const inSection = !onPage && item.section?.has(here.page.id) === true;
      const current = onPage ? ' aria-current="page"' : inSection ? ' aria-current="true"' : "";
      const href = targetHref(item.to, here);
      // GitHub's pages are in English, and say so.
      const en = href.startsWith("https://github.com/") ? ' hreflang="en"' : "";
      const a =
        `<a href="${escapeHtml(href)}"${en}${current}>` +
        `${escapeHtml(linkText(item.text, here.lang))}</a>`;
      return wrap === "" ? a : `<${wrap}>${a}</${wrap}>`;
    })
    .join("");
}

/** The operator's own links (hosted only): filled in by the server, or taken out. */
function operatorLinks(here: Here): string {
  if (here.mode !== "hosted") return "";
  const d = DICTS[here.lang];
  return (
    `<a href="${OPERATOR_TOKENS.privacy}" data-op="privacy">${escapeHtml(d.privacy)}</a>` +
    `<a href="${OPERATOR_TOKENS.contact}" data-op="contact">${escapeHtml(d.contact)}</a>`
  );
}

/** The placeholders of site/layout.html for `here`. */
function layoutFragments(here: Here, assets: PageAssets): Record<string, string> {
  const { page, lang, mode } = here;
  const attr = (s: string): string => escapeHtml(s);
  const abs = (p: string): string => attr(`${ORIGIN_TOKEN}${p}`);
  // The 404 page has no address of its own: its language switch leads to the home pages.
  const path = (l: SiteLang): string => pagePath(mode, l, page.notFound ? "" : page.slug);
  const pageHrefs = Object.fromEntries(
    PAGES.map((p) => [`p_${p.id.replaceAll("-", "_")}`, attr(targetHref({ page: p.id }, here))]),
  );
  return {
    ...pageHrefs,
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    pageId: attr(page.id),
    ogLocale: OG_LOCALES[lang],
    ogAltLocales: SITE_LANGS.filter((l) => l !== lang)
      .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALES[l]}">`)
      .join("\n"),
    script: attr(assets.scripts[page.script]),
    style: attr(assets.style),
    icon: attr(assets.icon),
    iconPng: attr(assets.iconPng),
    touchIcon: attr(assets.touchIcon),
    ogImage: abs(assets.og[lang]),
    // What the Open Graph picture shows: the brand and the headline (site/og/render.mjs).
    ogImageAlt: attr(`${lang === "ar" ? "ترجمان" : "Turjuman"}: ${headlineFor(lang)}`),
    canonical: page.notFound ? "" : `<link rel="canonical" href="${abs(path(lang))}">`,
    ogUrl: page.notFound ? "" : `<meta property="og:url" content="${abs(path(lang))}">`,
    preloads: assets.fonts
      .map((f) => `<link rel="preload" href="${attr(f)}" as="font" type="font/woff2" crossorigin>`)
      .join("\n"),
    robots: mode === "local" || page.notFound ? '<meta name="robots" content="noindex">' : "",
    // The structured data (organisation, website, app) of the public website's home pages.
    jsonLd:
      mode === "hosted" && page.id === "home"
        ? jsonLdScript(homeStructuredData(lang, ORIGIN_TOKEN, assets))
        : "",
    alternates: page.notFound
      ? ""
      : [
          ...LANG_SWITCH.map(
            ([l]) => `<link rel="alternate" hreflang="${l}" href="${abs(path(l))}">`,
          ),
          `<link rel="alternate" hreflang="x-default" href="${abs(path("en"))}">`,
        ].join("\n"),
    github: attr(GITHUB_URL),
    licenseUrl: attr(LICENSE_URL),
    startPath: attr(APP_PATHS[mode].start),
    loginPath: attr(APP_PATHS[mode].login),
    homeHref: attr(targetHref({ page: "home" }, here)),
    navLinks: navHtml(NAV, here),
    menuLinks: navHtml(MENU, here),
    footGroups: FOOT_GROUPS.map(
      ([title, links]) =>
        `<div class="fg"><p class="fg-h">${escapeHtml(linkText(title, lang))}</p>` +
        `<ul>${navHtml(links, here, "li")}</ul></div>`,
    ).join(""),
    footLinks:
      navHtml(FOOT_LINKS, here) +
      operatorLinks(here) +
      navHtml([{ text: "login", to: { app: "login" } }], here),
    wordmark: wordmarkHtml("wm"),
    // The wordmark link's name, in the page's script.
    brand: lang === "ar" ? "ترجمان" : "Turjuman",
    // The language switch keeps you on this page.
    langSwitch: LANG_SWITCH.map(
      ([l, name, short]) =>
        `<a href="${attr(path(l))}" hreflang="${l}" lang="${l}" data-lang="${l}"` +
        `${l === lang ? ' aria-current="page"' : ""}><span class="lg">${name}</span>` +
        `<span class="sh" aria-hidden="true">${short}</span></a>`,
    ).join(""),
  };
}

/** The words of `page` in `lang`: the shared ones, the page's own, and a text page's title. */
function pageWords(page: SitePage, lang: SiteLang): Record<string, string> {
  const doc = DOC_PAGES[page.id];
  const own =
    doc === undefined ? {} : { title: inLang(doc.title, lang), desc: inLang(doc.desc, lang) };
  return { ...DICTS[lang], ...(PAGE_WORDS[page.id]?.[lang] ?? {}), ...own };
}

/** The page's own fragments: the home page's demos, or a text page's sections. */
function pageFragments(here: Here, data: SiteData): Record<string, string> {
  if (here.page.id === "home") return homeFragments(here.lang);
  const doc = DOC_PAGES[here.page.id];
  if (doc === undefined) return {};
  const ctx: DocContext = {
    lang: here.lang,
    pageId: here.page.id,
    resolve: (t) => resolveTarget(t, here),
    languages: data.languages,
  };
  return docFragments(doc, ctx);
}

/** Every placeholder of the layout and of `page`'s template, in `lang`. */
export function pageValues(
  page: SitePage,
  lang: SiteLang,
  assets: PageAssets,
  mode: SiteMode = "hosted",
  data: SiteData = { languages: [] },
): Record<string, string> {
  const here = { page, lang, mode };
  return mergeValues(pageWords(page, lang), {
    ...layoutFragments(here, assets),
    ...pageFragments(here, data),
  });
}

export function renderPage(
  templates: Templates,
  page: SitePage,
  lang: SiteLang,
  assets: PageAssets,
  mode: SiteMode = "hosted",
  data: SiteData = { languages: [] },
): string {
  const name = page.template ?? page.id;
  const body = templates.pages[name];
  if (body === undefined) throw new Error(`site: no template site/pages/${name}.html`);
  const values = pageValues(page, lang, assets, mode, data);
  const content = fillTemplate(body, values);
  // The templates' own comments (tooling notes) and empty lines stay out of the page.
  const html = fillTemplate(templates.layout, { ...values, content })
    .replace(/<!--[\s\S]*?-->\n?/g, "")
    .replace(/\n\s*\n/g, "\n");
  // (JSON-LD has "}}" of its own, and never a "<": see jsonLdScript.)
  const markup = html.replace(/<script type="application\/ld\+json">[^<]*<\/script>/g, "");
  if (/\{\{|\}\}/.test(markup)) throw new Error("site: a placeholder is left unfilled");
  // The one inline <script> allowed is the JSON-LD data block: it is never run (CSP).
  if (
    /<script(?![^>]*\bsrc=)[^>]*>/i.test(markup) ||
    /<style\b/i.test(markup) ||
    /\sstyle\s*=/i.test(markup)
  ) {
    throw new Error("site page has an inline script or style (CSP)");
  }
  return html;
}
