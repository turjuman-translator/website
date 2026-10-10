// The simulation's timeline: when each caption line is said and translated, and when the prayer
// moments begin and end. Pure (no DOM), so it can be tested.
import type { CaptionLine, Moment } from "../content/khutbah.js";

export type ScriptItem = CaptionLine | { moment: Moment; dur: number };

interface CueBase {
  /** Index in the script. */
  i: number;
  /** Start and end (ms). */
  s: number;
  e: number;
}

export interface MomentCue extends CueBase {
  kind: "moment";
  moment: Moment;
}

export interface LineCue extends CueBase {
  kind: "line";
  line: CaptionLine;
  /** ms between Arabic words as they are said. */
  pace: number;
  /** The translation: words from trS over trSpan ms (speech), or all at trAt (a verse). */
  trS: number;
  trSpan: number;
  trAt: number;
  /** When the next line starts (this one dims) and when it leaves the screen. */
  pastAt: number;
  rmAt: number;
}

export type Cue = MomentCue | LineCue;

export interface TimelineOptions {
  /** Lines on screen at once. */
  maxBlocks: number;
  /** ms after the last cue before the loop restarts. */
  tail: number;
  arPace?: number;
  versePace?: number;
  /** ms the translation starts after the Arabic. */
  lag?: number;
}

export interface Timeline {
  cues: Cue[];
  lines: LineCue[];
  total: number;
}

const GAP = 140;

export function buildTimeline(script: readonly ScriptItem[], o: TimelineOptions): Timeline {
  const arPace = o.arPace ?? 330;
  const versePace = o.versePace ?? 520;
  const lag = o.lag ?? 700;
  const cues: Cue[] = [];
  let t = 0;
  script.forEach((item, i) => {
    const s = t + GAP;
    if ("moment" in item) {
      cues.push({ kind: "moment", i, s, e: s + item.dur, moment: item.moment });
      t = s + item.dur;
      return;
    }
    const n = item.ar.split(/\s+/).filter((w) => w !== "").length;
    if (item.verse !== undefined) {
      const e = s + n * versePace + 1900;
      const trAt = s + Math.min(4, n) * versePace + 300;
      cues.push({
        kind: "line",
        i,
        s,
        e,
        line: item,
        pace: versePace,
        trS: trAt,
        trSpan: 0,
        trAt,
        pastAt: Infinity,
        rmAt: Infinity,
      });
      t = e;
      return;
    }
    const span = n * arPace + 500;
    const e = s + span + 1400;
    cues.push({
      kind: "line",
      i,
      s,
      e,
      line: item,
      pace: arPace,
      trS: s + lag,
      trSpan: span - lag,
      trAt: s + lag,
      pastAt: Infinity,
      rmAt: Infinity,
    });
    t = e;
  });
  const lines = cues.filter((c): c is LineCue => c.kind === "line");
  lines.forEach((x, k) => {
    x.pastAt = lines[k + 1]?.s ?? Infinity;
    x.rmAt = lines[k + o.maxBlocks]?.s ?? Infinity;
  });
  // A prayer moment clears the screen: earlier lines dim and leave when it begins.
  for (const c of cues) {
    if (c.kind !== "moment") continue;
    for (const x of lines) {
      if (x.s < c.s && x.rmAt > c.s) x.rmAt = c.s;
      if (x.s < c.s && x.pastAt > c.s) x.pastAt = c.s;
    }
  }
  return { cues, lines, total: t + o.tail };
}

/** The prayer moment at `t`, if any. */
export function momentAt(cues: readonly Cue[], t: number): MomentCue | null {
  let found: MomentCue | null = null;
  for (const c of cues) if (c.kind === "moment" && c.s <= t && t < c.e) found = c;
  return found;
}

/** The cue of the prayer moment `m` (its first); a script without it is an error. */
export function momentCue(cues: readonly Cue[], m: Moment): MomentCue {
  const c = cues.find((x): x is MomentCue => x.kind === "moment" && x.moment === m);
  if (c === undefined) throw new Error(`the simulation has no ${m}`);
  return c;
}

/** When each phrase of a moment begins (weighted by length), plus the end of the last one; the
 *  final 2.2 s hold the last phrase. */
export function phraseStarts(c: MomentCue, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  const span = c.e - c.s - 2200;
  const out: number[] = [];
  let acc = 0;
  for (const w of weights) {
    out.push(c.s + (acc / sum) * span);
    acc += w;
  }
  out.push(c.s + span);
  return out;
}

export interface ClockChapter {
  /** Simulation ms this chapter starts and ends. */
  t0: number;
  t1: number;
  /** Seconds since midnight shown at its start and end. */
  from: number;
  to: number;
}

/** Index of the chapter holding `t`. */
export function chapterAt(chs: readonly ClockChapter[], t: number): number {
  for (let k = chs.length - 1; k >= 0; k--) if (t >= (chs[k]?.t0 ?? 0)) return k;
  return 0;
}

/** The clock time ("12:47:03") the simulation shows at `t`. */
export function clockAt(chs: readonly ClockChapter[], t: number): string {
  const c = chs[chapterAt(chs, t)];
  if (c === undefined) return "";
  const f = Math.min(1, Math.max(0, (t - c.t0) / (c.t1 - c.t0)));
  const s = Math.round(c.from + f * (c.to - c.from));
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** ms an arrow key moves the scrubber. */
export const KEY_STEP = 3000;

export interface KeySeek {
  t: number;
  /** End: the simulation stops on the last picture instead of looping back to the Athan. */
  pause: boolean;
}

/** Where a key on the scrubber goes from `t`: the arrows ±3 s, PageUp the next chapter, PageDown
 *  this chapter's start (or the previous one's, right after a start), Home the beginning and End
 *  (or PageUp in the last chapter) the final hold: `end`, the last chapter's end, where the
 *  simulation then stops. Other keys: null. */
export function keySeek(
  key: string,
  t: number,
  chs: readonly ClockChapter[],
  end: number,
): KeySeek | null {
  const k = chapterAt(chs, t);
  const start = (i: number): number => chs[i]?.t0 ?? 0;
  const to = (x: number, pause = false): KeySeek => ({
    t: Math.max(0, Math.min(end, x)),
    pause,
  });
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return to(t + KEY_STEP);
    case "ArrowLeft":
    case "ArrowDown":
      return to(t - KEY_STEP);
    case "PageUp":
      return k >= chs.length - 1 ? to(end, true) : to(start(k + 1));
    case "PageDown":
      return to(start(t - start(k) > 1500 ? k : Math.max(0, k - 1)));
    case "Home":
      return to(start(0));
    case "End":
      return to(end, true);
    default:
      return null;
  }
}

/** The scrubber's value, 0–100, at `t` of a simulation that ends (its final hold) at `end`. */
export function scrubPercent(t: number, end: number): number {
  return end <= 0 ? 0 : Math.round(Math.max(0, Math.min(1, t / end)) * 100);
}
