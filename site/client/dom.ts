// Small DOM helpers. Styles are only ever set through the CSSOM (the CSP allows no inline styles).
// The page's words are in its HTML (the build renders them): the script reads the few it switches
// between from data attributes, so no dictionary ships in the bundle.
import type { SiteLang } from "../content/khutbah.js";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls !== "") node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The element matching `selector` inside `root`; throws when the page is out of sync. */
export function find<T extends Element>(
  selector: string,
  ctor: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T {
  const node = root.querySelector(selector);
  if (!(node instanceof ctor)) throw new Error(`${selector} missing or not a ${ctor.name}`);
  return node;
}

export function findAll<T extends Element>(
  selector: string,
  ctor: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T[] {
  return [...root.querySelectorAll(selector)].filter((n): n is T => n instanceof ctor);
}

/** A brand colour token (--tj-…, a #rrggbb value) as "r, g, b", for drawing on a canvas. */
export function tokenRgb(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (m === null) return "0, 0, 0";
  return [m[1], m[2], m[3]].map((h) => Number.parseInt(h ?? "0", 16)).join(", ");
}

export function pageLang(): SiteLang {
  const lang = document.documentElement.lang;
  return lang === "nl" || lang === "ar" ? lang : "en";
}

/** The text of `node`'s data-`name` attribute (rendered by the build), or "". */
export function data(node: HTMLElement, name: string): string {
  return node.dataset[name] ?? "";
}

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the choice just isn't remembered
  }
}
