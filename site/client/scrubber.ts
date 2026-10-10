// A chapter scrubber under the board, like a video player's: drag, click or use the keys; hovering
// shows the chapter and the clock time. The thumb is placed with `left` only (its hover growth is
// the separate `scale` property, never a transform), so it stays exactly on the fill's edge.
// The last chapter ends on the final hold: End (or a drag to the end) stops the simulation there,
// and Play from there starts again at the Athan.
import type { Chapter } from "../content/khutbah.js";
import type { CaptionPlayer } from "./captions.js";
import { data, find, findAll } from "./dom.js";
import { clamp01 } from "./motion.js";
import { type ClockChapter, chapterAt, clockAt, keySeek, scrubPercent } from "./timeline.js";

export interface ScrubChapter extends ClockChapter {
  key: Chapter["key"];
}

export class Scrubber {
  private readonly track: HTMLElement;
  private readonly thumb: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly tipName: HTMLElement;
  private readonly tipTime: HTMLElement;
  private readonly time: HTMLElement;
  private readonly chapter: HTMLElement;
  private readonly play: HTMLButtonElement;
  private readonly segs: HTMLElement[];
  private readonly bars: HTMLElement[];
  private readonly fills: HTMLElement[];
  private readonly names: string[];
  /** The final hold: the end of the last chapter. */
  private readonly end: number;
  private dragging = false;
  private resume = false;
  /** Until the board's intro has landed; meanwhile the play button is the page's switch alone. */
  private locked = true;
  /** Called when the visitor plays or pauses the board here (not when the page pauses it):
   *  `button` says it was the play button, not a key that stops on the final hold. */
  onUserPlay: ((playing: boolean, button: boolean) => void) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly cap: CaptionPlayer,
    private readonly chs: readonly ScrubChapter[],
  ) {
    this.track = find(".yt-track", HTMLElement, root);
    this.thumb = find(".yt-thumb", HTMLElement, root);
    this.tip = find(".yt-tip", HTMLElement, root);
    this.tipName = find(".yt-tip-n", HTMLElement, root);
    this.tipTime = find(".yt-tip-t", HTMLElement, root);
    this.time = find(".yt-time", HTMLElement, root);
    this.chapter = find(".yt-chap", HTMLElement, root);
    this.play = find(".yt-play", HTMLButtonElement, root);
    this.segs = findAll(".yt-ch", HTMLElement, root);
    this.bars = this.segs.map((s) => find(".yt-bar", HTMLElement, s));
    this.fills = this.segs.map((s) => find(".yt-fill", HTMLElement, s));
    this.names = this.segs.map((s) => data(s, "name"));
    this.end = chs.at(-1)?.t1 ?? cap.total - 1;
    this.segs.forEach((s, k) => {
      const c = chs[k];
      if (c) s.style.setProperty("flex-grow", String(Math.max(1, Math.round(c.t1 - c.t0))));
    });
    this.setLocked(true);
    this.wire();
  }

  /** The track and the clock are dimmed and inert until the board's intro has finished. */
  setLocked(locked: boolean): void {
    this.locked = locked;
    this.root.classList.toggle("locked", locked);
    this.track.tabIndex = locked ? -1 : 0;
    this.track.setAttribute("aria-disabled", String(locked));
  }

  /** The play button shows the simulation's state (once the board has it: unlocked). */
  syncPlay(): void {
    this.play.classList.toggle("paused", !this.cap.playing);
    this.play.setAttribute("aria-label", data(this.play, this.cap.playing ? "pause" : "play"));
  }

  update(t: number): void {
    const k = chapterAt(this.chs, t);
    const track = this.track.getBoundingClientRect();
    this.chs.forEach((c, j) => {
      const f = clamp01((t - c.t0) / (c.t1 - c.t0));
      this.fills[j]?.style.setProperty("transform", `scaleX(${f.toFixed(4)})`);
      // The thumb sits on the edge of the current chapter's fill.
      if (j === k) {
        const r = this.barRect(j);
        const x = r.left - track.left + f * r.width;
        this.thumb.style.setProperty("left", `${(x - 7).toFixed(1)}px`);
      }
    });
    const clock = clockAt(this.chs, t);
    const name = this.names[k] ?? "";
    if (this.time.textContent !== clock) this.time.textContent = clock;
    if (this.chapter.textContent !== name) this.chapter.textContent = name;
    this.segs.forEach((s, j) => {
      s.classList.toggle("on", j === k);
    });
    this.track.setAttribute("aria-valuenow", String(scrubPercent(t, this.end)));
    this.track.setAttribute("aria-valuetext", `${clock} ${name}`);
  }

  private barRect(k: number): DOMRect {
    return (this.bars[k] ?? this.track).getBoundingClientRect();
  }

  /** Simulation time under the pointer at clientX: in the first chapter whose bar reaches it, or
   *  the last one. */
  private tAt(x: number): number {
    let t = 0;
    for (const [k, c] of this.chs.entries()) {
      const r = this.barRect(k);
      t = c.t0 + clamp01((x - r.left) / r.width) * (c.t1 - c.t0);
      if (x <= r.right + 2) break;
    }
    return t;
  }

  private showTip(x: number): void {
    const t = this.tAt(x);
    const tr = this.track.getBoundingClientRect();
    const w = this.tip.offsetWidth || 120;
    this.tipName.textContent = this.names[chapterAt(this.chs, t)] ?? "";
    this.tipTime.textContent = clockAt(this.chs, t);
    const left = Math.max(0, Math.min(tr.width - w, x - tr.left - w / 2));
    this.tip.style.setProperty("transform", `translateX(${left.toFixed(1)}px)`);
  }

  private userPlay(playing: boolean, button: boolean): void {
    if (playing) {
      // From the final hold, Play starts the Friday again.
      if (this.cap.t >= this.end - 1) this.cap.seek(0);
      this.cap.play();
    } else {
      this.cap.pause();
    }
    this.syncPlay();
    this.onUserPlay?.(playing, button);
  }

  private wire(): void {
    const { track, root, cap } = this;
    track.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.resume = cap.playing;
      cap.pause();
      cap.setScrubbing(true);
      root.classList.add("drag");
      try {
        track.setPointerCapture(e.pointerId);
      } catch {
        // capture is a nicety (the pointer may already be gone)
      }
      cap.seek(this.tAt(e.clientX));
      this.showTip(e.clientX);
    });
    track.addEventListener("pointermove", (e) => {
      this.showTip(e.clientX);
      if (this.dragging) cap.seek(this.tAt(e.clientX));
    });
    const end = (): void => {
      if (!this.dragging) return;
      this.dragging = false;
      root.classList.remove("drag");
      cap.setScrubbing(false);
      // Let go at the very end: the simulation stays on the final hold.
      if (this.resume && cap.t < this.end - 1) cap.play();
      this.syncPlay();
    };
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    track.addEventListener("lostpointercapture", end);
    track.addEventListener("pointerenter", () => root.classList.add("hover"));
    track.addEventListener("pointerleave", () => root.classList.remove("hover"));
    track.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const to = keySeek(e.key, cap.t, this.chs, this.end);
      if (to === null) return;
      e.preventDefault();
      cap.seek(to.t);
      if (to.pause && cap.playing) this.userPlay(false, false);
    });
    this.play.addEventListener("click", () => {
      if (!this.locked) this.userPlay(!cap.playing, true);
    });
  }
}
