// The pages of the website and where they live. English sits at the root and every language uses
// the same English slugs: /self-host, /nl/self-host, /ar/self-host (the local preview puts /site in
// front). Each page is an explicit route on the server (src/server/site.ts reads the build's
// routes.json), so /nl/self-host is never taken for the caption pair /:from/:to; a slug is
// therefore never a language code (at least four characters) and never one of the app's own
// first path segments (test/unit/site-routes.test.ts checks both).
import type { SiteLang } from "./khutbah.js";
import type { SiteMode } from "./links.js";

export interface SitePage {
  id: string;
  /** "" for the home page, else the English slug (one path segment). */
  slug: string;
  /** The script the page runs: the home page's demos, or the light one of the other pages. */
  script: "home" | "page";
  /** The template, site/pages/<template>.html (default: the id). */
  template?: string;
  /** A page of the self-host path: the stepper and previous/next links. */
  path?: boolean;
  /** The 404 page: no route of its own, no canonical or hreflang, not indexed. */
  notFound?: boolean;
}

export const PAGES: readonly SitePage[] = [
  { id: "home", slug: "", script: "home" },
  { id: "how-it-works", slug: "how-it-works", script: "page", template: "doc" },
  { id: "show-on-a-screen", slug: "show-on-a-screen", script: "page", template: "doc" },
  { id: "security", slug: "security", script: "page", template: "doc" },
  { id: "self-host", slug: "self-host", script: "page", template: "doc", path: true },
  { id: "install", slug: "install", script: "page", template: "doc", path: true },
  { id: "network", slug: "network", script: "page", template: "doc", path: true },
  { id: "docker", slug: "docker", script: "page", template: "doc", path: true },
  { id: "commands", slug: "commands", script: "page", template: "doc", path: true },
  { id: "not-found", slug: "not-found", script: "page", template: "doc", notFound: true },
];

/** The self-host path, in order (the stepper and the previous/next links follow it). Show on a
 *  screen is not on it: hosted and self-hosted mosques share that page (Install links to it). */
export const SELF_HOST_PATH: readonly string[] = [
  "self-host",
  "install",
  "network",
  "docker",
  "commands",
];

/** The pages of the self-host section: "Self-host" is marked in the nav on them. */
export const SELF_HOST_SECTION: ReadonlySet<string> = new Set(SELF_HOST_PATH);

/** Each page's own words (its title, description and text) by page id and language; the home
 *  page's, and the words every page shares (nav, footer), are in strings.ts. */
export const PAGE_WORDS: Readonly<
  Record<string, Readonly<Record<SiteLang, Readonly<Record<string, string>>>> | undefined>
> = {};

const SLUG = /^[a-z][a-z0-9-]{3,}$/;

/** Throws when a page's slug could be mistaken for a language code or is malformed. */
export function checkPages(pages: readonly SitePage[]): void {
  const seen = new Set<string>();
  for (const p of pages) {
    if (p.slug !== "" && !SLUG.test(p.slug)) {
      throw new Error(`site page "${p.id}": slug "${p.slug}" must be [a-z0-9-], 4+ characters`);
    }
    if (seen.has(p.slug) || seen.has(`id:${p.id}`)) {
      throw new Error(`site page "${p.id}": duplicate slug or id`);
    }
    seen.add(p.slug);
    seen.add(`id:${p.id}`);
  }
}

/** The path of `slug` (a page's) in `lang` and `mode`. */
export function pagePath(mode: SiteMode, lang: SiteLang, slug: string): string {
  const base = mode === "local" ? "/site" : "";
  const parts = [base, lang === "en" ? "" : `/${lang}`, slug === "" ? "" : `/${slug}`].join("");
  return parts === "" ? "/" : parts;
}

export function pageById(id: string): SitePage {
  const p = PAGES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`no site page "${id}"`);
  return p;
}
