import { describe, expect, it } from "vitest";
import {
  containerUnits,
  type DemoState,
  demoOptions,
  rollupBoxes,
  varNumber,
} from "../../site/client/caption-theme.js";
import { MOTION_KEY, SITE_LANG_KEY } from "../../site/client/storage-keys.js";
import {
  buildTimeline,
  chapterAt,
  clockAt,
  KEY_STEP,
  keySeek,
  momentAt,
  phraseStarts,
  type ScriptItem,
  scrubPercent,
} from "../../site/client/timeline.js";
import { CHAPTERS, KHUTBAH, PHRASES } from "../../site/content/khutbah.js";
import { BUILTIN_PRESETS, fontSizeVar } from "../../src/shared/theme.js";
import { APP_LANG_KEY, SITE_LANG_KEY as APP_READS_SITE_LANG } from "../../web/shared/app-i18n.js";

describe("site: what it keeps in the browser", () => {
  it("hands the page's language to the app under the key the app reads", () => {
    expect(SITE_LANG_KEY).toBe(APP_READS_SITE_LANG);
    expect(new Set([SITE_LANG_KEY, MOTION_KEY, APP_LANG_KEY]).size).toBe(3);
  });
});

describe("site: the simulation's timeline", () => {
  const script: ScriptItem[] = [
    { moment: "athan", dur: 5000 },
    ...KHUTBAH,
    { moment: "iqama", dur: 4000 },
    { moment: "salah", dur: 4000 },
  ];
  const tl = buildTimeline(script, { maxBlocks: 3, tail: 400 });

  it("runs the cues one after another", () => {
    expect(tl.cues.map((c) => (c.kind === "moment" ? c.moment : "line"))).toEqual([
      "athan",
      "line",
      "line",
      "line",
      "line",
      "line",
      "iqama",
      "salah",
    ]);
    for (let k = 1; k < tl.cues.length; k++) {
      expect(tl.cues[k]?.s).toBeGreaterThan(tl.cues[k - 1]?.e ?? Infinity);
    }
    expect(tl.total).toBe((tl.cues.at(-1)?.e ?? 0) + 400);
  });

  it("keeps at most three lines and clears them for a prayer moment", () => {
    const [a, b, c, d] = tl.lines;
    expect(a?.pastAt).toBe(b?.s);
    expect(a?.rmAt).toBe(d?.s);
    expect(c?.pastAt).toBe(d?.s);
    const iqama = tl.cues.find((x) => x.kind === "moment" && x.moment === "iqama");
    expect(tl.lines.at(-1)?.rmAt).toBe(iqama?.s);
    expect(momentAt(tl.cues, (iqama?.s ?? 0) + 1)?.moment).toBe("iqama");
    expect(momentAt(tl.cues, tl.lines[0]?.s ?? 0)).toBeNull();
  });

  it("lets a verse's translation settle as a whole, after its first words", () => {
    const verse = tl.lines.find((x) => x.line.verse !== undefined);
    expect(verse?.trAt).toBe((verse?.s ?? 0) + 4 * 520 + 300);
  });

  it("spreads a moment's phrases by their weight", () => {
    const salah = tl.cues.find((x) => x.kind === "moment" && x.moment === "salah");
    if (salah?.kind !== "moment") throw new Error("no salah");
    const starts = phraseStarts(
      salah,
      PHRASES.salah.map((p) => p.weight),
    );
    expect(starts).toHaveLength(PHRASES.salah.length + 1);
    expect(starts[0]).toBe(salah.s);
    expect(starts.at(-1)).toBe(salah.e - 2200);
  });

  it("shows the Friday's clock per chapter", () => {
    const chs = CHAPTERS.map((c, k) => ({
      t0: k * 1000,
      t1: (k + 1) * 1000,
      from: c.from,
      to: c.to,
    }));
    expect(clockAt(chs, 0)).toBe("12:45:00");
    expect(clockAt(chs, 500)).toBe("12:47:30");
    expect(clockAt(chs, 1000)).toBe("12:50:00");
    expect(clockAt(chs, 3000)).toBe("13:22:00");
    expect(clockAt(chs, 3999)).toBe("13:30:00");
    expect(chapterAt(chs, 2500)).toBe(2);
  });
});

describe("site: the scrubber's keys", () => {
  // Chapters of 10 s; the final hold is at the end of the last one.
  const chs = CHAPTERS.map((c, k) => ({
    t0: k * 10_000,
    t1: (k + 1) * 10_000,
    from: c.from,
    to: c.to,
  }));
  const end = 40_000;

  it("steps with the arrows, within the simulation", () => {
    expect(keySeek("ArrowRight", 5000, chs, end)).toEqual({ t: 5000 + KEY_STEP, pause: false });
    expect(keySeek("ArrowUp", 5000, chs, end)?.t).toBe(5000 + KEY_STEP);
    expect(keySeek("ArrowLeft", 1000, chs, end)).toEqual({ t: 0, pause: false });
    expect(keySeek("ArrowDown", 5000, chs, end)?.t).toBe(5000 - KEY_STEP);
    expect(keySeek("ArrowRight", 39_000, chs, end)).toEqual({ t: end, pause: false });
  });

  it("moves a chapter at a time with PageUp and PageDown", () => {
    expect(keySeek("PageUp", 5000, chs, end)?.t).toBe(10_000);
    expect(keySeek("PageDown", 25_000, chs, end)?.t).toBe(20_000);
    // right after a chapter's start, PageDown goes to the one before
    expect(keySeek("PageDown", 20_500, chs, end)?.t).toBe(10_000);
    expect(keySeek("PageDown", 500, chs, end)?.t).toBe(0);
  });

  it("stops on the final hold with End (and PageUp in the last chapter), never looping", () => {
    expect(keySeek("End", 12_000, chs, end)).toEqual({ t: end, pause: true });
    expect(keySeek("PageUp", 35_000, chs, end)).toEqual({ t: end, pause: true });
    expect(keySeek("Home", 35_000, chs, end)).toEqual({ t: 0, pause: false });
  });

  it("ignores other keys", () => {
    expect(keySeek("Enter", 0, chs, end)).toBeNull();
    expect(keySeek("a", 0, chs, end)).toBeNull();
  });

  it("reports its value as a percentage of the simulation", () => {
    expect(scrubPercent(0, end)).toBe(0);
    expect(scrubPercent(20_000, end)).toBe(50);
    expect(scrubPercent(end, end)).toBe(100);
    expect(scrubPercent(end + 400, end)).toBe(100);
  });
});

describe("site: the caption style demo", () => {
  const preset = (id: string) => {
    const p = BUILTIN_PRESETS.find((x) => x.id === id);
    if (p === undefined) throw new Error(id);
    return p;
  };
  const st = (o: Partial<DemoState> = {}): DemoState => ({
    preset: "mosque-dark",
    layout: null,
    size: null,
    src: false,
    quran: true,
    behind: "camera",
    ...o,
  });

  it("uses the preset's own options", () => {
    const o = demoOptions(preset("lower-third"), st({ src: true }));
    expect(o).toMatchObject({ layout: "rollup", bg: "band", size: 44, show: "both", lines: 2 });
    expect(demoOptions(preset("large-print"), st()).visibleBlocks).toBe(2);
  });

  it("brings a layout's own background when the layout is switched", () => {
    expect(demoOptions(preset("mosque-dark"), st({ layout: "rollup" })).bg).toBe("band");
    expect(demoOptions(preset("cinema"), st({ layout: "blocks" })).bg).toBe("panel");
    expect(demoOptions(preset("cinema"), st()).bg).toBe("shadow");
  });

  it("sizes the stage in container units", () => {
    expect(containerUnits(fontSizeVar(52))).toBe("min(52px, 5cqw)");
    expect(containerUnits("100vw 100vh 1.5em")).toBe("100cqw 100cqh 1.5em");
  });

  it("lays out roll-up lines like the caption page (the theme's source scale, integer px)", () => {
    expect(rollupBoxes(52, 1.35)).toEqual({
      source: { fontPx: 60, lineHeightPx: 93 },
      target: { fontPx: 52, lineHeightPx: 70 },
    });
    expect(rollupBoxes(40, Number.NaN).target.lineHeightPx).toBe(52);
    const lower = preset("lower-third");
    expect(varNumber(lower, "--cap-src-scale")).toBe(1.1);
    expect(rollupBoxes(44, varNumber(lower, "--cap-line-height"), 1.1)).toEqual({
      source: { fontPx: 48, lineHeightPx: 74 },
      target: { fontPx: 44, lineHeightPx: 57 },
    });
    // A blocks theme switched to roll-up keeps its own (smaller) source scale.
    expect(
      rollupBoxes(52, 1.35, varNumber(preset("mosque-dark"), "--cap-src-scale")).source,
    ).toEqual({ fontPx: 37, lineHeightPx: 57 });
  });
});
