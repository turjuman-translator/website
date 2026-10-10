// The website's pages in happy-dom, as the build renders them (site/render), and the browser parts
// the tests drive by hand: animation frames, IntersectionObserver, ResizeObserver,
// prefers-reduced-motion, a 2D canvas that records what it draws, document.fonts, a simple layout
// (getBoundingClientRect) and Element.animate. install() before a test, cleanup() after it; the
// client modules keep state of their own (site/client/motion.ts), so each test imports them afresh
// after vi.resetModules().
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type MockInstance, vi } from "vitest";
import type { SiteLang } from "../../../site/content/khutbah.js";
import { PAGES, pageById } from "../../../site/content/pages.js";
import { type PageAssets, renderPage } from "../../../site/render/page.js";

// (a path, not a URL: happy-dom's URL does not resolve file: URLs)
const SITE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "site");
const read = (file: string): string => readFileSync(join(SITE, file), "utf8");
const templates = {
  layout: read("layout.html"),
  pages: Object.fromEntries(
    [...new Set(PAGES.map((p) => p.template ?? p.id))].map((n) => [n, read(`pages/${n}.html`)]),
  ),
};
const assets: PageAssets = {
  scripts: { home: "/site-assets/home.js", page: "/site-assets/page.js" },
  style: "/site-assets/site.css",
  icon: "/site-assets/icon.svg",
  iconPng: "/site-assets/favicon.png",
  touchIcon: "/site-assets/touch-icon.png",
  og: { en: "/site-assets/og-en.png", nl: "/site-assets/og-nl.png", ar: "/site-assets/og-ar.png" },
  fonts: [],
};
const languages = [
  { code: "ar", native: "العربية" },
  { code: "nl", native: "Nederlands" },
];

/** Puts the page `id` in `lang`, as the build renders it, into the document (its body, and the
 *  language and direction of <html>), with the brand colours its stylesheet would give. */
export function showPage(id: string, lang: SiteLang = "en"): void {
  const html = renderPage(templates, pageById(id), lang, assets, "hosted", { languages });
  const body = /<body data-page="([^"]*)">([\s\S]*)<\/body>/.exec(html);
  if (body === null) throw new Error("rendered page without a body");
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";
  root.style.setProperty("--tj-ink", "#121916");
  root.style.setProperty("--tj-g600", "#23735c");
  root.style.setProperty("--tj-g800", "#0c3f31");
  document.body.innerHTML = body[2] ?? "";
  document.body.dataset.page = body[1] ?? "";
}

/** requestAnimationFrame by hand: tick() runs the callbacks waiting for the next frame. */
export class Frames {
  now = 1000;
  private queue: FrameRequestCallback[] = [];

  readonly request = (cb: FrameRequestCallback): number => {
    this.queue.push(cb);
    return this.queue.length;
  };

  get pending(): number {
    return this.queue.length;
  }

  /** The next frame, `ms` after the last one. */
  tick(ms = 16): void {
    this.now += ms;
    const due = this.queue;
    this.queue = [];
    for (const cb of due) cb(this.now);
  }

  /** Frames of `step` ms until `ms` have passed. */
  run(ms: number, step = 64): void {
    for (let t = 0; t < ms; t += step) this.tick(step);
  }
}

export class FakeIntersectionObserver {
  static all: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();
  disconnected = false;
  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: number[];

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    this.rootMargin = options.rootMargin ?? "0px";
    const t = options.threshold ?? 0;
    this.thresholds = Array.isArray(t) ? t : [t];
    FakeIntersectionObserver.all.push(this);
  }

  observe(el: Element): void {
    this.targets.add(el);
  }

  unobserve(el: Element): void {
    this.targets.delete(el);
  }

  disconnect(): void {
    this.disconnected = true;
    this.targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Scrolls `els` into view (or out of it): every observer watching them hears it. */
export function intersect(els: Element | readonly Element[], isIntersecting: boolean): void {
  const list = Array.isArray(els) ? els : [els];
  for (const io of [...FakeIntersectionObserver.all]) {
    const entries = list
      .filter((el) => io.targets.has(el))
      .map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry);
    if (entries.length > 0) io.callback(entries, io as unknown as IntersectionObserver);
  }
}

export class FakeResizeObserver {
  static all: FakeResizeObserver[] = [];
  readonly targets: Element[] = [];

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.all.push(this);
  }

  observe(el: Element): void {
    this.targets.push(el);
  }

  unobserve(): void {}

  disconnect(): void {}
}

/** Every ResizeObserver hears that its elements changed size. */
export function resizeAll(): void {
  for (const ro of FakeResizeObserver.all) ro.callback([], ro as unknown as ResizeObserver);
}

export interface Dot {
  x: number;
  y: number;
  r: number;
  fill: string;
}

/** A 2D context that keeps the dots of its last picture (cleared by clearRect). */
export class FakeContext {
  fillStyle = "";
  transform: number[] = [];
  dots: Dot[] = [];
  clears = 0;
  private path: Array<Omit<Dot, "fill">> = [];

  setTransform(...m: number[]): void {
    this.transform = m;
  }

  clearRect(): void {
    this.clears++;
    this.dots = [];
  }

  beginPath(): void {
    this.path = [];
  }

  moveTo(): void {}

  arc(x: number, y: number, r: number): void {
    this.path.push({ x, y, r });
  }

  fill(): void {
    for (const p of this.path) this.dots.push({ ...p, fill: this.fillStyle });
  }
}

/** The logo's arch is ARCH long and its two lines LINE (getTotalLength), and a point along the
 *  arch is on a simple curve through the logo's box (getPointAtLength). */
export const ARCH = 160;
export const LINE = 12;

export function svgGeometry(): void {
  vi.spyOn(SVGGeometryElement.prototype, "getTotalLength").mockImplementation(function (
    this: SVGGeometryElement,
  ) {
    return this.getAttribute("class") === "b-arch" ? ARCH : LINE;
  });
  vi.spyOn(SVGGeometryElement.prototype, "getPointAtLength").mockImplementation(
    (l: number) => new DOMPoint(12 + (40 * l) / ARCH, 46 - 40 * Math.sin((Math.PI * l) / ARCH)),
  );
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const placed = new WeakMap<Element, Box>();

/** Gives `el` a fixed place on the page (getBoundingClientRect). */
export function place(el: Element, box: Box): void {
  placed.set(el, box);
}

export interface Env {
  frames: Frames;
  contexts: FakeContext[];
  /** Element.animate calls: the element, its keyframes and options. */
  animate: MockInstance<Element["animate"]>;
  /** Resolves document.fonts.ready. */
  fontsReady: () => void;
  /** How elements without a place are measured; undefined: stacked rows (see below). */
  measure: (el: Element) => Box | undefined;
}

let added: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];
let stubbed: Array<[object, PropertyKey, PropertyDescriptor | undefined]> = [];

/** Sets a property of the window or the document (scrollY, innerWidth, hidden, …) for this test. */
export function setProperty(target: object, key: PropertyKey, value: unknown): void {
  stubbed.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
  Object.defineProperty(target, key, { configurable: true, value });
}

/**
 * A fresh browser for a test: reduced motion or not, fake frames, observers, timers and canvas.
 * Without a place of its own, an element is a 300×40 row stacked under its earlier siblings, so
 * moving rows around (glide) really moves them.
 */
export function install(o: { reduce?: boolean; canvas?: boolean } = {}): Env {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const frames = new Frames();
  vi.stubGlobal("requestAnimationFrame", frames.request);
  FakeIntersectionObserver.all = [];
  FakeResizeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: o.reduce === true && query === "(prefers-reduced-motion: reduce)",
    media: query,
  }));
  const contexts: FakeContext[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    if (o.canvas === false) return null;
    const ctx = new FakeContext();
    contexts.push(ctx);
    return ctx as unknown as CanvasRenderingContext2D;
  });
  let fontsReady = (): void => {};
  const ready = new Promise<void>((resolve) => {
    fontsReady = resolve;
  });
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
  const env: Env = {
    frames,
    contexts,
    animate: vi
      .spyOn(Element.prototype, "animate")
      .mockImplementation(() => ({ onfinish: null }) as Animation),
    fontsReady: () => fontsReady(),
    measure: () => undefined,
  };
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const parent = this.parentElement;
    const row = parent === null ? 0 : [...parent.children].indexOf(this);
    const b = placed.get(this) ??
      env.measure(this) ?? { left: 0, top: row * 40, width: 300, height: 40 };
    return new DOMRect(b.left, b.top, b.width, b.height);
  });
  // Listeners the modules add to the window and the document go when the test ends.
  added = [];
  for (const target of [window, document] as EventTarget[]) {
    const original = target.addEventListener.bind(target);
    vi.spyOn(target, "addEventListener").mockImplementation((type, listener, options) => {
      if (listener !== null) added.push([target, type, listener]);
      original(type, listener, options);
    });
  }
  return env;
}

export function cleanup(): void {
  for (const [target, type, listener] of added) {
    target.removeEventListener(type, listener);
    target.removeEventListener(type, listener, true);
  }
  added = [];
  for (const [target, key, original] of stubbed.reverse()) {
    if (original === undefined) Reflect.deleteProperty(target, key);
    else Object.defineProperty(target, key, original);
  }
  stubbed = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
  document.body.innerHTML = "";
  document.documentElement.className = "";
  localStorage.clear();
  vi.resetModules();
}
