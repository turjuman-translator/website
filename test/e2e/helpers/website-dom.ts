// What the website suites read from a page in Chrome. The tests are type-checked without the DOM
// library, so the code that runs in the page is a string (a function's source, see inPage), and
// what it returns is described here.
import type { Page } from "playwright-core";
import { inPage, waitFor } from "./website.js";

export interface LinkFact {
  /** The href as written, and as the browser resolves it. */
  raw: string;
  href: string;
  text: string;
  label: string | null;
  rel: string | null;
  hreflang: string | null;
  current: string | null;
  /** The nearest landmark-ish container: "nav.links", "nav.langs", "nav.menu-panel", "footer", … */
  area: string;
}

export interface PageFacts {
  lang: string;
  dir: string;
  pageId: string | null;
  title: string;
  desc: string | null;
  robots: string | null;
  canonical: string | null;
  /** [hreflang, href] of every <link rel="alternate" hreflang>. */
  alternates: Array<[string, string]>;
  og: Record<string, string>;
  jsonLd: string[];
  h1: string[];
  ids: string[];
  links: LinkFact[];
  /** Stylesheets, scripts, icons and preloads the head names. */
  resources: string[];
  /** A server token (__TJ_…) left in the page. */
  tokens: boolean;
}

const FACTS = `() => {
  const attr = (sel, name) => document.querySelector(sel)?.getAttribute(name) ?? null;
  const area = (a) => {
    const box = a.closest("nav, footer, header, main");
    if (box === null) return "";
    const tag = box.tagName.toLowerCase();
    const cls = typeof box.className === "string" && box.className !== "" ? "." + box.className.split(" ")[0] : "";
    return tag + cls;
  };
  const og = {};
  for (const m of document.querySelectorAll('meta[property^="og:"]')) {
    const k = m.getAttribute("property").slice(3);
    og[k] = og[k] === undefined ? m.getAttribute("content") : og[k] + " " + m.getAttribute("content");
  }
  return {
    lang: document.documentElement.getAttribute("lang") ?? "",
    dir: document.documentElement.getAttribute("dir") ?? "",
    pageId: document.body.dataset.page ?? null,
    title: document.title,
    desc: attr('meta[name="description"]', "content"),
    robots: attr('meta[name="robots"]', "content"),
    canonical: attr('link[rel="canonical"]', "href"),
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
      l.getAttribute("hreflang"),
      l.getAttribute("href"),
    ]),
    og,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    ids: [...document.querySelectorAll("[id]")].map((e) => e.id),
    links: [...document.querySelectorAll("a[href]")].map((a) => ({
      raw: a.getAttribute("href"),
      href: a.href,
      text: a.textContent.trim().replace(/\\s+/g, " "),
      label: a.getAttribute("aria-label"),
      rel: a.getAttribute("rel"),
      hreflang: a.getAttribute("hreflang"),
      current: a.getAttribute("aria-current"),
      area: area(a),
    })),
    resources: [
      ...[...document.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"], link[rel="preload"]')].map((l) => l.href),
      ...[...document.querySelectorAll("script[src]")].map((s) => s.src),
    ],
    tokens: document.documentElement.outerHTML.includes("__TJ_"),
  };
}`;

export function pageFacts(page: Page): Promise<PageFacts> {
  return inPage<PageFacts>(page, FACTS);
}

export interface Overflow {
  scrollWidth: number;
  clientWidth: number;
  /** Elements and text that stick out of the viewport's sides without a box that clips or
   *  scrolls them (the page's own clip on <body> does not count: it would hide the problem). */
  offenders: string[];
}

const OVERFLOW = `() => {
  const root = document.documentElement;
  const vw = root.clientWidth;
  const name = (el) =>
    el.tagName.toLowerCase() +
    (el.id ? "#" + el.id : "") +
    (typeof el.className === "string" && el.className.trim() !== "" ? "." + el.className.trim().split(/\\s+/).join(".") : "");
  const clips = new Map();
  const clipped = (from) => {
    if (from === null || from === document.body || from === root) return false;
    let c = clips.get(from);
    if (c === undefined) {
      c = getComputedStyle(from).overflowX !== "visible" || clipped(from.parentElement);
      clips.set(from, c);
    }
    return c;
  };
  const out = (r) => r.width > 0 && r.height > 0 && (r.left < -1 || r.right > vw + 1);
  const offenders = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (out(r) && !clipped(el.parentElement)) {
      offenders.push(name(el) + " [" + Math.round(r.left) + ", " + Math.round(r.right) + "]");
    }
  }
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) {
    if (n.textContent.trim() === "" || n.parentElement === null) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (out(r) && !clipped(n.parentElement)) {
      offenders.push('text "' + n.textContent.trim().slice(0, 40) + '" in ' + name(n.parentElement) + " [" + Math.round(r.left) + ", " + Math.round(r.right) + "]");
    }
  }
  return { scrollWidth: root.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 12) };
}`;

export function overflow(page: Page): Promise<Overflow> {
  return inPage<Overflow>(page, OVERFLOW);
}

/** Scrolls to the bottom of the page and back to the top at once (no smooth scrolling), so
 *  whatever starts when it comes into view has started. */
export async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(
    "window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })",
  );
  await page.waitForTimeout(150);
  await page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
}

/** The text of the first element matching `selector`, or null. */
export function textOf(page: Page, selector: string): Promise<string | null> {
  return inPage<string | null>(
    page,
    "(s) => document.querySelector(s)?.textContent ?? null",
    selector,
  );
}

/** An attribute of the first element matching `selector`, or null. */
export function attrOf(page: Page, selector: string, name: string): Promise<string | null> {
  return inPage<string | null>(
    page,
    "([s, n]) => document.querySelector(s)?.getAttribute(n) ?? null",
    [selector, name],
  );
}

/** How many elements match `selector`. */
export function countOf(page: Page, selector: string): Promise<number> {
  return inPage<number>(page, "(s) => document.querySelectorAll(s).length", selector);
}

/** Is the element matching `selector` rendered (a box, not display: none, not hidden)? */
export function isShown(page: Page, selector: string): Promise<boolean> {
  return inPage<boolean>(
    page,
    `(s) => {
      const el = document.querySelector(s);
      if (el === null) return false;
      const r = el.getBoundingClientRect();
      // checkVisibility: also not inside a closed <details> (content-visibility: hidden).
      return r.width > 0 && r.height > 0 && el.checkVisibility({ visibilityProperty: true });
    }`,
    selector,
  );
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/** The bounding box of the first element matching `selector` (viewport coordinates). */
export function boxOf(page: Page, selector: string): Promise<Box | null> {
  return inPage<Box | null>(
    page,
    `(s) => {
      const el = document.querySelector(s);
      if (el === null) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }`,
    selector,
  );
}

/** Waits until an element matching `selector` that is shown has exactly the text `text`. */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  timeout = 10_000,
): Promise<void> {
  const expr = `[...document.querySelectorAll(${JSON.stringify(selector)})].some((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.textContent.trim() === ${JSON.stringify(text)};
  })`;
  try {
    await waitFor(page, expr, `${selector} saying "${text}"`, timeout);
  } catch (err) {
    const seen = await inPage<string[]>(
      page,
      "(s) => [...document.querySelectorAll(s)].map((el) => el.textContent.trim())",
      selector,
    );
    throw new Error(`${(err as Error).message} (seen: ${JSON.stringify(seen)})`);
  }
}

/** The element that has the focus, as tag.class (or "body"). */
export function focused(page: Page): Promise<string> {
  return inPage<string>(
    page,
    `() => {
      const el = document.activeElement;
      if (el === null) return "";
      const cls = typeof el.className === "string" && el.className !== "" ? "." + el.className.trim().split(/\\s+/).join(".") : "";
      return el.tagName.toLowerCase() + cls;
    }`,
  );
}

/** Scrolls the element matching `selector` to the middle of the screen at once, and resolves
 *  once an IntersectionObserver has seen it there: by then the page's own observers (what starts
 *  when it comes into view) have been told too. */
export async function reveal(page: Page, selector: string): Promise<void> {
  await inPage<boolean>(
    page,
    `(s) => new Promise((resolve) => {
      const el = document.querySelector(s);
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          resolve(true);
        }
      });
      io.observe(el);
    })`,
    selector,
  );
}
