// How the style demo turns a real preset (src/shared/theme.ts) plus the visitor's choices into what
// the caption page would show. Pure, so it can be tested.
import { BUILTIN_PRESETS, DEFAULT_OPTIONS } from "../../src/shared/theme.js";
import type { DisplayOptions, ThemePreset } from "../../src/shared/theme-vars.js";

export type Behind = "camera" | "black" | "white" | "transparent";

export interface DemoState {
  preset: string;
  /** null: the preset's own layout / size. */
  layout: DisplayOptions["layout"] | null;
  size: number | null;
  /** Show the Arabic under the translation (show=both). */
  src: boolean;
  quran: boolean;
  behind: Behind;
}

/** vw/vh → cqw/cqh: the demo stage is a 1920×1080 size container standing in for the screen. */
export function containerUnits(css: string): string {
  return css.replace(/(\d)vw\b/g, "$1cqw").replace(/(\d)vh\b/g, "$1cqh");
}

/** The display options for `p` with the visitor's changes. Like the caption page's URL options
 *  (resolveTheme): switching the layout brings that layout's own background. */
export function demoOptions(p: ThemePreset, st: DemoState): DisplayOptions {
  const base: DisplayOptions = { ...DEFAULT_OPTIONS, ...p.options };
  const layout = st.layout ?? base.layout;
  let bg: DisplayOptions["bg"] =
    layout === base.layout ? base.bg : layout === "rollup" ? "band" : "panel";
  if (layout === "rollup" && bg === "panel") bg = "band";
  if (layout === "blocks" && bg === "band") bg = "panel";
  if (layout === "blocks" && bg === "shadow") bg = "none";
  return {
    ...base,
    layout,
    bg,
    size: st.size ?? base.size,
    show: st.src ? "both" : "target",
    quranArabic: st.quran,
  };
}

/** The built-in preset `id`, or the first one; there is always one. */
export function demoPreset(
  id: string,
  presets: readonly ThemePreset[] = BUILTIN_PRESETS,
): ThemePreset {
  const p = presets.find((x) => x.id === id) ?? presets[0];
  if (p === undefined) throw new Error("the style demo has no presets");
  return p;
}

/** Whether choosing `p` shows the Arabic line (its show option). */
export function presetShowsSource(p: ThemePreset): boolean {
  return (p.options.show ?? DEFAULT_OPTIONS.show) === "both";
}

export interface LineBox {
  fontPx: number;
  lineHeightPx: number;
}

/** A theme variable's number ("1.1" → 1.1), or NaN (themeNumber in web/shared/theme-boot.ts). */
export function varNumber(p: ThemePreset, name: keyof ThemePreset["vars"]): number {
  return Number.parseFloat(p.vars[name] ?? "");
}

/** The roll-up layout's integer-px line boxes, as the caption page sizes them (blockGeometry in
 *  web/shared/rollup.ts, fed by web/caption.ts): the Arabic at the theme's source scale (1.15
 *  without one) with line-height 1.55, the translation at the theme's line height (default 1.3). */
export function rollupBoxes(
  size: number,
  lineHeight: number,
  srcScale = Number.NaN,
): { source: LineBox; target: LineBox } {
  const latin = Number.isFinite(lineHeight) && lineHeight >= 0.8 ? lineHeight : 1.3;
  const scale = Number.isFinite(srcScale) ? srcScale : 1.15;
  const src = Math.max(6, Math.round(size * scale));
  return {
    source: { fontPx: src, lineHeightPx: Math.round(src * 1.55) },
    target: { fontPx: size, lineHeightPx: Math.round(size * latin) },
  };
}
