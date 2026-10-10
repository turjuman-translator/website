// The live headline: the Arabic line lights up word by word as it is "said", and the translation
// reveals itself word by word just behind it, cycling through six languages. Paused or under
// reduced motion it shows the whole line.
import { HEADLINES, LANG_NAMES } from "../content/khutbah.js";
import { find, findAll } from "./dom.js";
import {
  addTicker,
  isPaused,
  onPausedChange,
  reduceMotion,
  splitWords,
  watchVisible,
} from "./motion.js";

const CLEAR = 420;
const STEP = 430;
const LAG = 520;
const HOLD = 2800;

export function liveHeadline(stage: HTMLElement, startLang: string): void {
  const line = find(".a1-h", HTMLElement, stage);
  const pair = find(".a1-pair span", HTMLElement, stage);
  const arabic = find(".a1-ar", HTMLElement, stage);
  const aws = findAll(".aw", HTMLElement, arabic);
  let idx = Math.max(
    0,
    HEADLINES.findIndex(([l]) => l === startLang),
  );
  let shown: HTMLSpanElement[] = [];

  const setText = (i: number): void => {
    const [lang, text] = HEADLINES[i] ?? ["en", ""];
    line.textContent = "";
    line.lang = lang;
    shown = splitWords(line, text, "w");
    pair.textContent = LANG_NAMES[lang] ?? lang;
  };
  const lightAll = (): void => {
    for (const w of shown) w.classList.add("on");
    for (const a of aws) a.classList.add("on");
  };

  // Reserve the height of the tallest translation, so the page never jumps.
  const reserveHeight = (): void => {
    const probe = line.cloneNode(false) as HTMLElement;
    probe.classList.add("a1-probe");
    // Not the line's reserved height (an inline style wins over .a1-probe's min-height: 0), or
    // the height could never shrink when the window widens.
    probe.style.removeProperty("min-height");
    probe.style.setProperty("width", `${line.getBoundingClientRect().width}px`);
    line.after(probe);
    let max = 0;
    for (const [lang, text] of HEADLINES) {
      probe.lang = lang;
      probe.textContent = text;
      max = Math.max(max, probe.getBoundingClientRect().height);
    }
    probe.remove();
    line.style.setProperty("min-height", `${Math.ceil(max)}px`);
  };

  setText(idx);
  lightAll();
  reserveHeight();
  window.addEventListener("resize", reserveHeight);
  arabic.classList.add("live");
  if (reduceMotion) return;

  const speak = aws.length * STEP + 380;
  const cycle = CLEAR + speak + HOLD;
  let u = -1800;
  let cleared = false;
  let switched = false;
  let visible = true;
  watchVisible(stage, (v) => {
    visible = v;
  });
  onPausedChange((paused) => {
    if (paused) lightAll();
  });
  addTicker((dt) => {
    if (isPaused() || !visible) return;
    u += dt;
    if (u < 0) return;
    if (u < CLEAR) {
      if (!cleared) {
        cleared = true;
        for (const w of shown) w.classList.remove("on");
        for (const a of aws) a.classList.remove("on");
      }
      return;
    }
    if (!switched) {
      switched = true;
      idx = (idx + 1) % HEADLINES.length;
      setText(idx);
    }
    const s = u - CLEAR;
    const span = speak - LAG;
    aws.forEach((a, k) => {
      a.classList.toggle("on", s >= k * STEP);
    });
    shown.forEach((w, k) => {
      w.classList.toggle("on", s >= LAG + k * (span / shown.length));
    });
    if (u >= cycle) {
      u = 0;
      cleared = false;
      switched = false;
    }
  });
}
