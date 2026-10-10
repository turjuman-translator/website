// The two-sided board under the hero: the translation on the left, the Arabic on the right, and a
// Friday in the simulation: Athan, the khutbah (with a verse), Iqama and Salah. The logo intro
// plays once the board is 60% in view; the simulation and its scrubber start when it has landed.
// The scrubber's play button is the page's "Pause animations" switch: it pauses or plays
// everything that moves, not just the board, and this device remembers it. Until the board starts
// the button is the page's alone (site/client/chrome.ts motionButton); then the board takes it.
import { CHAPTERS, KHUTBAH, type Moment, PHRASE_PACE, PHRASES } from "../content/khutbah.js";
import { CaptionPlayer } from "./captions.js";
import { pauseMotion } from "./chrome.js";
import { find } from "./dom.js";
import type { Lattice } from "./dots.js";
import { playIntro } from "./intro.js";
import { MomentLines } from "./moments.js";
import { isPaused, onPausedChange, reduceMotion } from "./motion.js";
import { Scrubber, type ScrubChapter } from "./scrubber.js";
import { type LineCue, momentCue, type ScriptItem } from "./timeline.js";

/** How long a prayer moment lasts in the simulation: its phrases, then a 2.2 s hold. */
function momentDuration(m: Moment): number {
  const weight = PHRASES[m].reduce((a, p) => a + p.weight, 0);
  return Math.round(weight * PHRASE_PACE[m]) + 2200;
}

export function captionBoard(o: {
  board: HTMLElement;
  scrubber: HTMLElement;
  lang: "en" | "nl";
  lattice: () => Lattice;
  /** Hands the play button over to the board (it was the page's switch until it started). */
  takeButton: () => void;
}): void {
  const { board } = o;
  const home = find("#home-mark", HTMLElement, board);
  const script: ScriptItem[] = [
    { moment: "athan", dur: momentDuration("athan") },
    ...KHUTBAH,
    { moment: "iqama", dur: momentDuration("iqama") },
    { moment: "salah", dur: momentDuration("salah") },
  ];
  const cap = new CaptionPlayer(board, script, o.lang, { maxBlocks: 3, tail: 400 });
  const athan = momentCue(cap.cues, "athan");
  const iqama = momentCue(cap.cues, "iqama");
  const salah = momentCue(cap.cues, "salah");
  const khutbah = cap.cues.find((c): c is LineCue => c.kind === "line");
  // A chapter starts where its card or its first line starts (each cue begins a short gap after
  // the one before), so a still board at a chapter's start shows it. The last chapter ends on the
  // final hold (the end of the Salah card), where End stops.
  const bounds = [athan.s, khutbah?.s ?? athan.e, iqama.s, salah.s, salah.e - 1];
  const chapters: ScrubChapter[] = CHAPTERS.map((c, k) => ({
    key: c.key,
    t0: bounds[k] ?? 0,
    t1: bounds[k + 1] ?? cap.total - 1,
    from: c.from,
    to: c.to,
  }));
  const scrub = new Scrubber(o.scrubber, cap, chapters);
  const lines = new MomentLines(board, cap.cues);
  cap.onTime = (t, instant) => {
    scrub.update(t);
    lines.update(t, instant);
  };

  // What a still picture shows (reduced motion, or animations paused before the board started or
  // during its intro):
  // the verse, fully said, under the two lines before it.
  const verse = cap.cues.find((c): c is LineCue => c.kind === "line" && c.line.verse !== undefined);
  const still = verse === undefined ? 0 : verse.e - 1;

  let started = false;
  /** The board is waiting for "Play animations" to continue. */
  let held = false;
  cap.pause();
  cap.seek(0);

  const start = (animated: boolean): void => {
    home.classList.remove("away");
    const go = (): void => {
      started = true;
      board.classList.remove("intro");
      o.takeButton();
      scrub.setLocked(false);
      if (reduceMotion || isPaused()) {
        cap.seek(still);
        held = !reduceMotion;
      } else {
        cap.seek(0);
        cap.play();
      }
      scrub.syncPlay();
    };
    if (animated) window.setTimeout(go, 450);
    else go();
  };

  scrub.onUserPlay = (playing, button) => {
    held = false;
    // End (on the final hold) stops only the simulation: the rest of the page moves on.
    if (button) pauseMotion(!playing);
  };
  onPausedChange((paused) => {
    if (!started) return;
    if (paused && cap.playing) {
      cap.pause();
      held = true;
    } else if (!paused && held) {
      cap.play();
      held = false;
    }
    scrub.syncPlay();
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    start(false);
    return;
  }
  home.classList.add("away");
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting) || started) return;
      io.disconnect();
      if (isPaused()) {
        start(false);
        return;
      }
      playIntro({
        lattice: o.lattice,
        area: board,
        home: find("svg", SVGSVGElement, home),
        size: 230,
        onLanded: () => start(true),
      });
    },
    { threshold: 0.6 },
  );
  io.observe(board);
}
