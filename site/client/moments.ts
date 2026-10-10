// Prayer moments on the board: the Arabic side stacks the phrases as they are said (newest at the
// bottom, older ones glide up and fade, at most five), and the other side names the moment once
// its first phrase has been heard. After a seek (`instant`) the stack is drawn at once.
import { type Moment, PHRASES, type Phrase } from "../content/khutbah.js";
import { el } from "./dom.js";
import { glide, splitWords } from "./motion.js";
import { type Cue, momentAt, phraseStarts } from "./timeline.js";

const MAX_LINES = 5;

interface Line {
  el: HTMLParagraphElement;
  words: HTMLSpanElement[];
}

function lineEl(p: Phrase, past: boolean): Line {
  const e = el("p", `bc-line${p.quran ? " q" : ""}${past ? " past" : ""}`);
  e.lang = "ar";
  e.dir = "rtl";
  const words = splitWords(e, p.ar, past ? "mw on" : "mw");
  return { el: e, words };
}

export class MomentLines {
  private lastMoment: Moment | null = null;
  private lastIdx = -1;
  private lines: Line[] = [];

  constructor(
    private readonly board: HTMLElement,
    private readonly cues: readonly Cue[],
  ) {}

  update(t: number, instant = false): void {
    const c = momentAt(this.cues, t);
    for (const card of this.board.querySelectorAll(".bcard")) {
      if (c === null || !card.classList.contains(c.moment)) card.classList.remove("det");
    }
    if (c === null) {
      this.lastMoment = null;
      this.lastIdx = -1;
      return;
    }
    const card = this.board.querySelector(`.bcard.${c.moment}`);
    const box = card?.querySelector(".bc-lines");
    if (!card || !box) return;
    const phrases = PHRASES[c.moment];
    const starts = phraseStarts(
      c,
      phrases.map((p) => p.weight),
    );
    let idx = 0;
    phrases.forEach((_, i) => {
      if (t >= (starts[i] ?? Infinity)) idx = i;
    });
    if (c.moment !== this.lastMoment || idx < this.lastIdx || idx > this.lastIdx + 1) {
      // A jump (scrubbing, another moment): rebuild the recent lines at once.
      box.textContent = "";
      this.lines = [];
      const first = Math.max(0, idx - (MAX_LINES - 1));
      phrases.slice(first, idx + 1).forEach((p, j) => {
        const line = lineEl(p, first + j < idx);
        box.append(line.el);
        this.lines.push(line);
      });
      this.lastMoment = c.moment;
      this.lastIdx = idx;
    } else if (idx === this.lastIdx + 1) {
      // The next phrase enters at the bottom and the stack glides up.
      const p = phrases[idx];
      if (p !== undefined) {
        const next = lineEl(p, false);
        const mutate = (): void => {
          for (const l of this.lines) {
            l.el.classList.add("past");
            for (const w of l.words) w.classList.add("on");
          }
          box.append(next.el);
          this.lines.push(next);
          while (this.lines.length > MAX_LINES) this.lines.shift()?.el.remove();
        };
        if (instant) mutate();
        else glide(box, mutate, 900);
      }
      this.lastIdx = idx;
    }
    const cur = this.lines[this.lines.length - 1];
    const a = starts[idx] ?? c.s;
    const b = starts[idx + 1] ?? c.e;
    if (cur !== undefined) {
      const n = cur.words.length;
      cur.words.forEach((w, k) => {
        w.classList.toggle("on", t >= a + k * (((b - a) * 0.7) / n));
      });
    }
    card.classList.toggle("det", t >= Math.min(starts[1] ?? Infinity, c.s + 2000));
  }
}
