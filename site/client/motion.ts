// One animation clock for the page, and one switch that pauses what moves (WCAG 2.2.2): the
// headline, the dot drift, the demos and the board. Visitors who ask for reduced motion get still
// pictures from the start.
import { el } from "./dom.js";

export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Called every frame with the milliseconds since the last one (at most 64). */
export type Ticker = (dt: number) => void;

const tickers: Ticker[] = [];
const listeners: Array<(paused: boolean) => void> = [];
let paused = false;
let started = false;
let last: number | null = null;

export function isPaused(): boolean {
  return paused;
}

export function setPaused(value: boolean): void {
  if (value === paused) return;
  paused = value;
  // CSS animations (the live dots) stop too.
  document.documentElement.classList.toggle("motion-paused", value);
  for (const f of listeners) f(value);
}

export function onPausedChange(f: (paused: boolean) => void): void {
  listeners.push(f);
}

export function addTicker(f: Ticker): void {
  tickers.push(f);
  if (started) return;
  started = true;
  const frame = (now: number): void => {
    const dt = last === null ? 0 : Math.min(64, now - last);
    last = now;
    for (const t of tickers) t(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Calls `cb` when `node` comes into view or leaves it (with a margin). */
export function watchVisible(node: Element, cb: (visible: boolean) => void, margin = "80px"): void {
  if (!("IntersectionObserver" in window)) {
    cb(true);
    return;
  }
  new IntersectionObserver(
    (entries) => {
      for (const e of entries) cb(e.isIntersecting);
    },
    { rootMargin: margin },
  ).observe(node);
}

export const ease = {
  out: (t: number): number => 1 - (1 - t) ** 4,
  inOut: (t: number): number => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
};

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Progress of `t` through [a, b], clamped to 0…1. */
export function seg(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a));
}

/** Text split into word spans of class `cls` (with spaces between), appended to `parent`. */
export function splitWords(parent: HTMLElement, text: string, cls: string): HTMLSpanElement[] {
  const parts = text.split(/\s+/).filter((w) => w !== "");
  return parts.map((w, i) => {
    const span = el("span", cls, w);
    parent.append(span);
    if (i < parts.length - 1) parent.append(" ");
    return span;
  });
}

/** Moves the children of `box` from where they were to where `mutate` puts them (FLIP). */
export function glide(box: Element, mutate: () => void, ms: number): void {
  const kids = [...box.children] as HTMLElement[];
  const before = kids.map((k) => k.getBoundingClientRect().top);
  mutate();
  if (reduceMotion) return;
  kids.forEach((k, i) => {
    if (!k.isConnected) return;
    const dy = (before[i] ?? 0) - k.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) {
      k.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
        duration: ms,
        easing: "cubic-bezier(.22,1,.36,1)",
      });
    }
  });
}
