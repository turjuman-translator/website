// The caption board's player: renders the timeline at any time t, so the same board can play by
// itself, be scrubbed, or be paused. Each line shows its Arabic word by word as it is said, and the
// translation follows (a verse settles as a whole, in Amiri Quran, with its reference).
// A seek (a drag, a click or a key on the scrubber) shows its moment at once: while the board has
// the class "jump" nothing fades or glides (board.css), so a moment's lines never linger over the
// captions after a fast drag.
import { el } from "./dom.js";
import { addTicker, glide, splitWords, watchVisible } from "./motion.js";
import {
  buildTimeline,
  type Cue,
  type LineCue,
  momentAt,
  type ScriptItem,
  type TimelineOptions,
} from "./timeline.js";

interface Shown {
  block: HTMLDivElement;
  ar: HTMLParagraphElement;
  arWords: HTMLSpanElement[];
  tr: HTMLParagraphElement;
  trWords: HTMLSpanElement[];
}

export class CaptionPlayer {
  t = 0;
  playing = false;
  readonly total: number;
  readonly cues: Cue[];
  /** Called after every render with the time shown; `instant` after a seek. */
  onTime: ((t: number, instant: boolean) => void) | null = null;

  private readonly lines: LineCue[];
  private readonly shown = new Map<LineCue, Shown>();
  private readonly caps: HTMLElement;
  private visible = true;
  private signature = "";
  private readonly fadeAll: number;
  private scrubbing = false;
  private jumps = 0;

  constructor(
    private readonly board: HTMLElement,
    script: readonly ScriptItem[],
    private readonly lang: "en" | "nl",
    o: TimelineOptions,
  ) {
    const tl = buildTimeline(script, o);
    this.cues = tl.cues;
    this.lines = tl.lines;
    this.total = tl.total;
    this.fadeAll = tl.total - 650;
    const caps = board.querySelector(".caps");
    if (!(caps instanceof HTMLElement)) throw new Error("caption board without .caps");
    this.caps = caps;
    watchVisible(board, (v) => {
      this.visible = v;
    });
    addTicker((dt) => {
      if (this.playing && this.visible) this.step(dt);
    });
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seek(t: number): void {
    // Going back: rebuild from scratch rather than un-animating.
    if (t < this.t - 1) this.clear();
    this.t = Math.max(0, Math.min(this.total - 1, t));
    this.jump();
    this.render(this.t, true);
    this.settle();
  }

  /** While the visitor drags the scrubber, every change shows at once. */
  setScrubbing(on: boolean): void {
    this.scrubbing = on;
    if (on) this.jump();
    else this.settle();
  }

  /** Transitions off, and whatever was still moving lands where it was going. */
  private jump(): void {
    this.board.classList.add("jump");
    for (const a of this.board.getAnimations({ subtree: true })) {
      try {
        a.finish();
      } catch {
        // an endless animation cannot finish; it is not a caption's
      }
    }
  }

  /** Transitions come back once the jump has been painted (two frames later). */
  private settle(): void {
    const n = ++this.jumps;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (n === this.jumps && !this.scrubbing) this.board.classList.remove("jump");
      }),
    );
  }

  private step(dt: number): void {
    this.t += dt;
    if (this.t >= this.total) {
      this.t = 0;
      this.clear();
    }
    this.render(this.t);
  }

  private clear(): void {
    for (const s of this.shown.values()) s.block.remove();
    this.shown.clear();
    this.signature = "";
  }

  private make(x: LineCue): Shown {
    const verse = x.line.verse !== undefined;
    const block = el("div", verse ? "blk verse" : "blk");
    const ar = el("p", "ar");
    ar.lang = "ar";
    ar.dir = "rtl";
    const tr = el("p", verse ? "tr whole" : "tr");
    tr.lang = this.lang;
    const text = x.line[this.lang];
    let trWords: HTMLSpanElement[] = [];
    if (verse) tr.append(el("span", "txt", text), el("span", "ref", x.line.verse?.ref ?? ""));
    else trWords = splitWords(tr, text, "w");
    const shown = { block, ar, arWords: splitWords(ar, x.line.ar, "w rtl"), tr, trWords };
    block.append(ar, tr);
    this.shown.set(x, shown);
    return shown;
  }

  private render(t: number, instant = false): void {
    const want = this.lines.filter((x) => x.s <= t && t < x.rmAt + 460 && t < this.total);
    const signature = want.map((x) => x.i).join(",");
    if (signature !== this.signature) {
      const mutate = (): void => {
        for (const [x, s] of this.shown) {
          if (!want.includes(x)) {
            s.block.remove();
            this.shown.delete(x);
          }
        }
        for (const x of want) this.caps.append((this.shown.get(x) ?? this.make(x)).block);
      };
      if (instant || this.scrubbing) mutate();
      else glide(this.caps, mutate, 640);
      this.signature = signature;
    }
    // What is shown is what is wanted (put in place above, now or at the last change).
    for (const [x, s] of this.shown) {
      s.block.classList.toggle("past", t >= x.pastAt);
      s.block.classList.toggle("leaving", t >= x.rmAt || t >= this.fadeAll);
      s.arWords.forEach((w, k) => {
        w.classList.toggle("on", t >= x.s + k * x.pace);
      });
      if (x.line.verse !== undefined) {
        s.tr.classList.toggle("on", t >= x.trAt);
      } else {
        const m = s.trWords.length;
        s.trWords.forEach((w, k) => {
          w.classList.toggle("on", t >= x.trS + k * (x.trSpan / m));
        });
      }
    }
    const moment = momentAt(this.cues, t)?.moment ?? "";
    if ((this.board.dataset.card ?? "") !== moment) this.board.dataset.card = moment;
    this.onTime?.(t, instant || this.scrubbing);
  }
}
