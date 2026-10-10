// @vitest-environment happy-dom
// The caption board's player (site/client/captions.ts) and its prayer-moment lines
// (site/client/moments.ts): the Arabic word by word as it is said, the translation behind it, a
// verse settling as a whole, three lines at most, a prayer moment clearing the screen and stacking
// its phrases; a seek shows at once.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTimeline,
  type LineCue,
  type MomentCue,
  momentCue,
  phraseStarts,
  type ScriptItem,
} from "../../site/client/timeline.js";
import { KHUTBAH, type Moment, PHRASES, VERSE } from "../../site/content/khutbah.js";
import { cleanup, type Env, install, intersect, showPage } from "./helpers/site-client-env.js";

let env: Env;

const SCRIPT: ScriptItem[] = [
  { moment: "athan", dur: 25_000 },
  ...KHUTBAH,
  { moment: "iqama", dur: 15_400 },
  { moment: "salah", dur: 14_755 },
];
const OPTS = { maxBlocks: 3, tail: 400 };
const TL = buildTimeline(SCRIPT, OPTS);
const [L1, L2, V, L4] = TL.lines as [LineCue, LineCue, LineCue, LineCue, LineCue];
const ATHAN = momentCue(TL.cues, "athan");
const IQAMA = momentCue(TL.cues, "iqama");
const SALAH = momentCue(TL.cues, "salah");

async function load(o: { reduce?: boolean } = {}) {
  env = install(o);
  showPage("home");
  const captions = await import("../../site/client/captions.js");
  const moments = await import("../../site/client/moments.js");
  return { ...captions, ...moments };
}

afterEach(cleanup);

const board = (): HTMLElement => document.querySelector<HTMLElement>("#board") ?? document.body;
const blocks = (): HTMLElement[] => [...board().querySelectorAll<HTMLElement>(".caps .blk")];
const on = (els: Iterable<Element>): boolean[] => [...els].map((w) => w.classList.contains("on"));
/** What a caption block shows. */
const block = (b: HTMLElement | undefined) => ({
  cls: b?.className,
  ar: on(b?.querySelectorAll(".ar .w") ?? []),
  tr: on(b?.querySelectorAll(".tr .w") ?? []),
});

describe("site: the caption player", () => {
  it("fails loudly on a board without captions", async () => {
    const { CaptionPlayer } = await load();
    const bare = document.createElement("div");
    expect(() => new CaptionPlayer(bare, SCRIPT, "en", OPTS)).toThrow(
      "caption board without .caps",
    );
  });

  it("says each line in Arabic word by word, and the translation follows", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    expect([cap.total, cap.cues]).toEqual([TL.total, TL.cues]);
    cap.seek(L1.s);
    const [b] = blocks();
    const ar = b?.querySelector<HTMLElement>(".ar");
    const tr = b?.querySelector<HTMLElement>(".tr");
    expect([ar?.lang, ar?.dir, tr?.lang]).toEqual(["ar", "rtl", "en"]);
    expect(ar?.textContent).toBe(KHUTBAH[0]?.ar);
    expect(tr?.textContent).toBe(KHUTBAH[0]?.en);
    expect(block(b)).toEqual({
      cls: "blk",
      ar: [true, false, false, false, false, false],
      tr: Array(16).fill(false),
    });
    cap.seek(L1.s + 2 * L1.pace);
    expect(block(b).ar).toEqual([true, true, true, false, false, false]);
    cap.seek(L1.trS);
    expect(block(b).tr.filter(Boolean)).toHaveLength(1);
    // the sixteen words of the translation spread over its span
    const last = L1.trS + (L1.trSpan * 15) / 16;
    cap.seek(last - 1);
    expect(block(b)).toEqual({
      cls: "blk",
      ar: Array(6).fill(true),
      tr: [...Array(15).fill(true), false],
    });
    cap.seek(last);
    expect(block(b).tr).toEqual(Array(16).fill(true));
    expect(blocks()).toHaveLength(1);
  });

  it("lets a verse settle as a whole, in the visitor's language, with its reference", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "nl", OPTS);
    cap.seek(V.trAt - 1);
    const verse = blocks()[2];
    expect(verse?.className).toBe("blk verse");
    const tr = verse?.querySelector(".tr");
    expect(tr?.className).toBe("tr whole");
    expect(tr?.querySelector(".txt")?.textContent).toBe(VERSE.nl);
    expect(tr?.querySelector(".ref")?.textContent).toBe("49:13");
    expect(tr?.getAttribute("lang")).toBe("nl");
    cap.seek(V.trAt);
    expect(tr?.classList.contains("on")).toBe(true);
  });

  it("dims a line when the next begins, and keeps three lines at most", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    cap.seek(L2.s);
    expect(blocks().map((b) => b.className)).toEqual(["blk past", "blk"]);
    cap.seek(L4.s);
    expect(blocks().map((b) => b.className)).toEqual([
      "blk past leaving",
      "blk past",
      "blk verse past",
      "blk",
    ]);
    cap.seek(L4.s + 460);
    expect(blocks().map((b) => b.querySelector(".ar")?.textContent)).toEqual(
      KHUTBAH.slice(1, 4).map((l) => l.ar),
    );
  });

  it("clears the screen for a prayer moment and names it on the board", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    cap.seek(ATHAN.s);
    expect(board().dataset.card).toBe("athan");
    cap.seek(IQAMA.s - 1);
    expect(board().dataset.card).toBe("");
    expect(blocks()).toHaveLength(3);
    cap.seek(IQAMA.s);
    expect(board().dataset.card).toBe("iqama");
    expect(blocks().every((b) => b.classList.contains("leaving"))).toBe(true);
    cap.seek(IQAMA.s + 460);
    expect(blocks()).toEqual([]);
    cap.seek(SALAH.s);
    expect(board().dataset.card).toBe("salah");
  });

  it("names the moment on a board that has no card attribute yet", async () => {
    const { CaptionPlayer } = await load();
    board().removeAttribute("data-card");
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    cap.seek(0);
    expect(board().hasAttribute("data-card")).toBe(false);
    cap.seek(ATHAN.s);
    expect(board().dataset.card).toBe("athan");
  });

  it("rebuilds from scratch when it goes back", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    cap.seek(L2.s + 100);
    const first = blocks()[0];
    cap.seek(L1.s + 100);
    expect(blocks()).toHaveLength(1);
    expect(blocks()[0]).not.toBe(first);
    expect(first?.isConnected).toBe(false);
    // a seek never leaves the simulation
    cap.seek(-500);
    expect(cap.t).toBe(0);
    cap.seek(TL.total + 500);
    expect(cap.t).toBe(TL.total - 1);
  });

  it("plays by itself while it is in view, and starts over at the end", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    const times: Array<[number, boolean]> = [];
    cap.onTime = (t, instant) => times.push([t, instant]);
    cap.seek(1000);
    env.frames.tick();
    env.frames.run(640);
    expect(cap.t).toBe(1000);
    cap.play();
    env.frames.run(640);
    expect(cap.t).toBe(1640);
    expect(times.at(-1)).toEqual([1640, false]);
    expect(times[0]).toEqual([1000, true]);
    intersect(board(), false);
    env.frames.run(640);
    expect(cap.t).toBe(1640);
    intersect(board(), true);
    cap.seek(L1.s + 500);
    expect(blocks()).toHaveLength(1);
    cap.seek(TL.total - 32);
    env.frames.run(64);
    expect(cap.t).toBe(0);
    expect([blocks(), board().dataset.card]).toEqual([[], ""]);
    env.frames.run(64);
    expect(cap.t).toBe(64);
    cap.pause();
    env.frames.run(640);
    expect(cap.t).toBe(64);
  });

  it("glides the lines up when one leaves while it plays", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    cap.seek(L4.s + 400);
    const [, second, third, fourth] = blocks();
    env.animate.mockClear();
    cap.play();
    env.frames.tick();
    env.frames.run(128);
    expect(blocks()).toEqual([second, third, fourth]);
    expect(env.animate.mock.contexts).toEqual([second, third, fourth]);
  });

  it("shows a seek at once: no transition until it has been painted", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    const done = { finish: vi.fn() };
    const endless = {
      finish: vi.fn(() => {
        throw new DOMException("endless", "InvalidStateError");
      }),
    };
    const animations = vi.fn(() => [done, endless] as unknown as Animation[]);
    board().getAnimations = animations;
    const jump = () => board().classList.contains("jump");
    cap.seek(L1.s);
    expect(jump()).toBe(true);
    expect(animations).toHaveBeenCalledWith({ subtree: true });
    expect([done.finish, endless.finish].map((f) => f.mock.calls.length)).toEqual([1, 1]);
    env.frames.tick();
    cap.seek(L1.s + 100);
    env.frames.tick();
    // the first seek's frames are over, but the second is not painted yet
    expect(jump()).toBe(true);
    env.frames.tick();
    expect(jump()).toBe(false);
  });

  it("shows every change at once while the visitor drags", async () => {
    const { CaptionPlayer } = await load();
    const cap = new CaptionPlayer(board(), SCRIPT, "en", OPTS);
    const times: boolean[] = [];
    cap.onTime = (_t, instant) => times.push(instant);
    cap.setScrubbing(true);
    expect(board().classList.contains("jump")).toBe(true);
    cap.seek(L4.s + 400);
    env.frames.run(256);
    expect(board().classList.contains("jump")).toBe(true);
    // a frame of play while dragging: still at once, no glide
    cap.play();
    env.animate.mockClear();
    env.frames.run(128);
    expect(blocks()).toHaveLength(3);
    expect(env.animate).not.toHaveBeenCalled();
    expect(times.every(Boolean)).toBe(true);
    cap.pause();
    cap.setScrubbing(false);
    env.frames.tick();
    expect(board().classList.contains("jump")).toBe(true);
    env.frames.tick();
    expect(board().classList.contains("jump")).toBe(false);
  });
});

describe("site: the prayer moments on the board", () => {
  const card = (m: Moment): HTMLElement =>
    board().querySelector<HTMLElement>(`.bcard.${m}`) ?? document.body;
  const lines = (m: Moment) =>
    [...card(m).querySelectorAll<HTMLElement>(".bc-line")].map((l) => ({
      text: l.textContent,
      cls: l.className,
      words: on(l.querySelectorAll(".mw")),
    }));
  const starts = (c: MomentCue): number[] =>
    phraseStarts(
      c,
      PHRASES[c.moment].map((p) => p.weight),
    );
  const said = (m: Moment, k: number): string => PHRASES[m][k]?.ar ?? "";

  it("stacks the Athan as it is said, the newest at the bottom, five at most", async () => {
    const { MomentLines } = await load();
    const ml = new MomentLines(board(), TL.cues);
    const at = starts(ATHAN);
    ml.update(at[0] ?? 0);
    expect(lines("athan")).toEqual([
      { text: said("athan", 0), cls: "bc-line", words: [true, false, false, false] },
    ]);
    const first = card("athan").querySelector<HTMLElement>(".bc-line");
    expect([first?.lang, first?.dir]).toEqual(["ar", "rtl"]);
    for (let k = 1; k <= 6; k++) ml.update(at[k] ?? 0);
    const now = lines("athan");
    expect(now.map((l) => l.text)).toEqual([2, 3, 4, 5, 6].map((k) => said("athan", k)));
    expect(now.map((l) => l.cls)).toEqual([...Array(4).fill("bc-line past"), "bc-line"]);
    expect(now.slice(0, 4).every((l) => l.words.every(Boolean))).toBe(true);
  });

  it("lights the current phrase word by word over the first 70% of its time", async () => {
    const { MomentLines } = await load();
    const ml = new MomentLines(board(), TL.cues);
    const [a = 0, b = 0] = starts(ATHAN);
    const word = ((b - a) * 0.7) / 4;
    ml.update(a + word * 2);
    expect(lines("athan")[0]?.words).toEqual([true, true, true, false]);
    ml.update(a + word * 3 + 1);
    expect(lines("athan")[0]?.words).toEqual([true, true, true, true]);
  });

  it("names the moment once its first phrase has been heard (two seconds at most)", async () => {
    const { MomentLines } = await load();
    const ml = new MomentLines(board(), TL.cues);
    const at = starts(ATHAN);
    ml.update((at[1] ?? 0) - 1);
    expect(card("athan").classList.contains("det")).toBe(false);
    ml.update(at[1] ?? 0);
    expect(card("athan").classList.contains("det")).toBe(true);
    ml.update(SALAH.s + 10);
    expect([card("athan"), card("salah")].map((c) => c.classList.contains("det"))).toEqual([
      false,
      false,
    ]);
    // between moments nothing is named
    ml.update((starts(SALAH)[1] ?? 0) + 10);
    expect(card("salah").classList.contains("det")).toBe(true);
    ml.update(IQAMA.s - 1);
    expect(card("salah").classList.contains("det")).toBe(false);
    // a slow Athan: its name after two seconds, before its first phrase ends
    const slow = buildTimeline([{ moment: "athan", dur: 60_000 }], OPTS).cues;
    const long = new MomentLines(board(), slow);
    long.update(140 + 1999);
    expect(card("athan").classList.contains("det")).toBe(false);
    long.update(140 + 2000);
    expect(card("athan").classList.contains("det")).toBe(true);
    expect(lines("athan")).toHaveLength(1);
  });

  it("draws the recent phrases at once after a jump, forward or back", async () => {
    const { MomentLines } = await load();
    const ml = new MomentLines(board(), TL.cues);
    const at = starts(IQAMA);
    ml.update((at[6] ?? 0) + 10, true);
    expect(lines("iqama").map((l) => l.text)).toEqual([2, 3, 4, 5, 6].map((k) => said("iqama", k)));
    ml.update((at[1] ?? 0) + 10, true);
    expect(lines("iqama").map((l) => l.cls)).toEqual(["bc-line past", "bc-line"]);
    // into the next moment: its own card, from its start
    ml.update((starts(SALAH)[2] ?? 0) + 10);
    expect(lines("salah").map((l) => l.cls)).toEqual([
      "bc-line past",
      "bc-line q past",
      "bc-line q",
    ]);
    expect(env.animate).not.toHaveBeenCalled();
  });

  it("glides the stack up as a new phrase enters, unless it is shown at once", async () => {
    const { MomentLines } = await load();
    const ml = new MomentLines(board(), TL.cues);
    const at = starts(ATHAN);
    for (let k = 0; k <= 4; k++) ml.update(at[k] ?? 0);
    expect(env.animate).not.toHaveBeenCalled();
    const before = [...card("athan").querySelectorAll(".bc-line")];
    ml.update(at[5] ?? 0);
    expect(env.animate.mock.contexts).toEqual(before.slice(1));
    env.animate.mockClear();
    ml.update(at[6] ?? 0, true);
    expect(env.animate).not.toHaveBeenCalled();
    expect(lines("athan")).toHaveLength(5);
  });

  it("does nothing for a moment the board has no card for", async () => {
    const { MomentLines } = await load();
    card("iqama").remove();
    const ml = new MomentLines(board(), TL.cues);
    expect(() => ml.update(IQAMA.s + 100)).not.toThrow();
    expect(board().querySelectorAll(".bc-line")).toHaveLength(0);
  });
});
