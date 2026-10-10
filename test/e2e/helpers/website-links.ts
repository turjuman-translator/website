// The website's links, checked without ever leaving the machine: an address on the test server is
// fetched (once per suite, however many pages link to it), and an address elsewhere is only read.
// A link to a document on GitHub must name a file this repository has (the self-hosted edition,
// github.com/turjuman-translator/cli, is exported from it) and a heading that file has.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GITHUB_ORG } from "../../../site/content/links.js";
import { REPO } from "./paths.js";

/** What an address on the test server answered. */
export interface Fetched {
  status: number;
  contentType: string;
  location: string | null;
  xRobotsTag: string | null;
  /** For an HTML page: <html lang>, <body data-page>, its title, description, robots meta, ids,
   *  canonical and hreflang links. */
  lang: string | null;
  pageId: string | null;
  title: string | null;
  desc: string | null;
  robots: string | null;
  canonical: string | null;
  alternates: Array<[string, string]>;
  ids: Set<string>;
}

const attrRe = (tag: string, name: string): RegExp =>
  new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]*)"`, "i");

type HtmlFacts = Pick<
  Fetched,
  "lang" | "pageId" | "title" | "desc" | "robots" | "canonical" | "alternates" | "ids"
>;

function parseHtml(html: string): HtmlFacts {
  const alternates: Array<[string, string]> = [];
  for (const m of html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)) {
    alternates.push([m[1] ?? "", m[2] ?? ""]);
  }
  return {
    lang: attrRe("html", "lang").exec(html)?.[1] ?? null,
    pageId: attrRe("body", "data-page").exec(html)?.[1] ?? null,
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? null,
    desc: /<meta name="description" content="([^"]*)">/.exec(html)?.[1] ?? null,
    robots: /<meta name="robots" content="([^"]*)">/.exec(html)?.[1] ?? null,
    canonical: /<link rel="canonical" href="([^"]+)">/.exec(html)?.[1] ?? null,
    alternates,
    ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "")),
  };
}

/** Fetches each address once (GET, as a browser asks for a page; redirects are not followed). */
export class LinkFetcher {
  private readonly seen = new Map<string, Promise<Fetched>>();

  get(url: string): Promise<Fetched> {
    const key = url.split("#")[0] ?? url;
    let p = this.seen.get(key);
    if (p === undefined) {
      p = this.load(key);
      this.seen.set(key, p);
    }
    return p;
  }

  private async load(url: string): Promise<Fetched> {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    const html = contentType.startsWith("text/html") ? await res.text() : "";
    if (html === "") await res.arrayBuffer();
    return {
      status: res.status,
      contentType,
      location: res.headers.get("location"),
      xRobotsTag: res.headers.get("x-robots-tag"),
      ...parseHtml(html),
    };
  }
}

/** Is `href` an address on the test server `origin` (to fetch), or elsewhere (to read)? */
export function isInternal(href: string, origin: string): boolean {
  return href.startsWith(`${origin}/`) || href === origin;
}

/** The repositories the website links to, and the files of this repository the self-hosted
 *  edition leaves out (scripts/export-selfhost.ts, EXCLUDED). */
const REPOS = new Set(["website", "cli"]);
const NOT_IN_CLI = [
  /^site\//,
  /^selfhost\//,
  /^scripts\/(build-site|export-selfhost)\.ts$/,
  /^docs\/hosting\.md$/,
];

/** The anchors GitHub gives the headings of a Markdown file (github-slugger: lower case, only
 *  letters, digits, "_", "-" and spaces kept, spaces made "-", a repeat gets -1, -2, …). */
export function markdownAnchors(markdown: string): Set<string> {
  const out = new Set<string>();
  const count = new Map<string, number>();
  let fenced = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (h === null) continue;
    const text = (h[1] ?? "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[`*]/g, "");
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
      .replace(/ /g, "-");
    const n = count.get(base) ?? 0;
    count.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

/** Why a link to another site is wrong, or null when it is right: https, a site the website
 *  means to send people to, and on GitHub an existing file and heading. */
export function externalProblem(href: string, allowed: readonly string[] = []): string | null {
  if (allowed.includes(href)) return null;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return "not a URL";
  }
  if (u.protocol !== "https:") return "not https";
  if (u.hostname === "console.soniox.com" || u.hostname === "soniox.com") return null;
  if (u.hostname === "nodejs.org") return null;
  if (u.hostname !== "github.com") return `an unexpected site (${u.hostname})`;
  if (!href.startsWith(GITHUB_ORG)) return "not the project's GitHub organisation";
  const [org, repo, kind, branch, ...file] = u.pathname.split("/").filter((s) => s !== "");
  if (org === undefined) return "no organisation";
  if (repo === undefined) return u.hash === "" ? null : "a fragment on the organisation";
  if (!REPOS.has(repo)) return `an unknown repository (${repo})`;
  if (kind === undefined) return u.hash === "" || u.hash === "#readme" ? null : "a fragment";
  if (kind === "security" && branch === undefined) return null;
  if (kind !== "blob" || branch !== "main" || file.length === 0) return "not a file on main";
  const rel = file.map(decodeURIComponent).join("/");
  if (!existsSync(join(REPO, rel))) return `no such file in the repository (${rel})`;
  if (repo === "cli" && NOT_IN_CLI.some((re) => re.test(rel))) {
    return `${rel} is not in the self-hosted edition`;
  }
  if (u.hash !== "") {
    if (!rel.endsWith(".md")) return "a fragment on a file that is not Markdown";
    const anchor = decodeURIComponent(u.hash.slice(1));
    if (!markdownAnchors(readFileSync(join(REPO, rel), "utf8")).has(anchor)) {
      return `no heading #${anchor} in ${rel}`;
    }
  }
  return null;
}
