// The two small demos: the verse (its words light up as recited, then the translation settles)
// and the prayer screen (a segmented control that cycles Athan, Iqama and Salah).
import { MOMENTS, type Moment } from "../content/khutbah.js";
import { find, findAll } from "./dom.js";
import { addTicker, isPaused, onPausedChange, reduceMotion, watchVisible } from "./motion.js";

const WORD_MS = 520;

export function verseDemo(root: HTMLElement): void {
  const ws = findAll(".vd-ar .w", HTMLElement, root);
  const tr = find(".vd-tr", HTMLElement, root);
  const n = ws.length;
  const cycle = n * WORD_MS + 5200;
  let t = 0;
  let visible = true;
  const render = (all: boolean): void => {
    const u = t % cycle;
    const shown = u < n * WORD_MS + 3800;
    ws.forEach((w, k) => {
      w.classList.toggle("lit", all || (u >= k * WORD_MS && shown));
    });
    tr.classList.toggle("on", all || (u >= 4 * WORD_MS + 300 && shown));
  };
  root.classList.add("ready");
  if (reduceMotion) {
    render(true);
    return;
  }
  render(false);
  watchVisible(root, (v) => {
    visible = v;
  });
  onPausedChange((paused) => render(paused));
  addTicker((dt) => {
    if (isPaused() || !visible) return;
    t += dt;
    render(false);
  });
}

const DWELL = 3200;

export function prayerDemo(root: HTMLElement): void {
  const screen = find(".tj-screen", HTMLElement, root);
  const buttons = findAll("[data-moment]", HTMLButtonElement, root);
  let current = MOMENTS.indexOf((screen.dataset.card as Moment | undefined) ?? "iqama");
  let acc = 0;
  let visible = true;
  const show = (k: number): void => {
    current = k;
    const moment = MOMENTS[k] ?? "iqama";
    for (const b of buttons) {
      const on = b.dataset.moment === moment;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }
    screen.dataset.card = moment;
  };
  for (const b of buttons) {
    b.addEventListener("click", () => {
      show(Math.max(0, MOMENTS.indexOf(b.dataset.moment as Moment)));
      // stay a little longer on a moment the visitor picked
      acc = -4000;
    });
  }
  show(Math.max(0, current));
  if (reduceMotion) return;
  watchVisible(root, (v) => {
    visible = v;
  });
  addTicker((dt) => {
    if (isPaused() || !visible) return;
    acc += dt;
    if (acc > DWELL) {
      acc = 0;
      show((current + 1) % MOMENTS.length);
    }
  });
}
