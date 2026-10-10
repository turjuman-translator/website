// The home page's own fragments (site/pages/home.html): the live headline, the two-sided board and
// its scrubber, the real caption page with the app's presets, the verse and the prayer screen, and
// the self-host commands.
import { BUILTIN_PRESETS, DEFAULT_PRESET_ID } from "../../src/shared/theme.js";
import { splitHonorifics } from "../../src/text/honorifics.js";
import { isMsgKey, message } from "../../web/shared/app-i18n.js";
import { markSvg, ON_PINE, PINE } from "../../web/shared/brand.js";
import { eventLabel } from "../../web/shared/i18n.js";
import {
  CHAPTERS,
  captionLang,
  HEADLINE_AR,
  headlineFor,
  LANG_NAMES,
  MOMENTS,
  PREVIEW_LINES,
  type SiteLang,
  VERSE,
} from "../content/khutbah.js";
import { SELF_HOST_COMMANDS } from "../content/links.js";
import { DICTS, SCREEN_WORDS } from "../content/strings.js";
import { codeLine, escapeHtml, wordSpans } from "./html.js";

const MOMENT_KEYS = { athan: "m_athan", iqama: "m_iqama", salah: "m_salah" } as const;
const LOCK =
  '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
  '<rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
  '<path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

/** Caption text with honorific ligatures wrapped like the caption page does (web/shared/hon.ts). */
function honHtml(text: string): string {
  return splitHonorifics(text)
    .map((run) =>
      run.honorific
        ? `<span class="cap-hon" lang="ar">${escapeHtml(run.text)}</span>`
        : escapeHtml(run.text),
    )
    .join("");
}

/** A built-in theme's name as the app shows it in `lang` (web/shared/app-i18n.ts). */
export function presetName(lang: SiteLang, id: string, fallback: string): string {
  const key = `preset.${id}`;
  return isMsgKey(key) ? message(lang, key) : fallback;
}

/** Shell commands, one block each; a long line wraps between words or after a slash. */
export function commandLines(commands: readonly string[]): string {
  return commands.map(codeLine).join("");
}

/** The real caption page's markup (blocks and roll-up), as web/shared/blocks.ts and rollup.ts
 *  build it, holding three lines of the khutbah. */
function captionStage(lang: "en" | "nl"): string {
  const { opening, verse, hadith } = PREVIEW_LINES;
  const block = (kind: string, inner: string, extra = ""): string =>
    `<article class="blk blk-${kind}${extra}" lang="${lang}" dir="ltr">${inner}</article>`;
  const src = (ar: string): string =>
    `<p class="blk-src" dir="rtl" lang="ar">${escapeHtml(ar)}</p>`;
  const blocks = [
    block(
      "speech",
      `<p class="blk-text"><span class="blk-body">${honHtml(opening[lang])}</span></p>${src(opening.ar)}`,
    ),
    block(
      "quran",
      `<p class="blk-quran-ar" dir="rtl" lang="ar">${escapeHtml(verse.ar)}</p>` +
        `<p class="blk-text">"<span class="blk-body">${honHtml(verse[lang])}</span>" ` +
        `<span class="blk-ref">(${escapeHtml(verse.verse?.ref ?? "")})</span></p>`,
      " has-accent",
    ),
    // A quoted hadith is speech like the rest: only the Quran gets a block kind of its own.
    block(
      "speech",
      `<p class="blk-text"><span class="blk-body">${honHtml(hadith[lang])}</span></p>${src(hadith.ar)}`,
      " is-new",
    ),
  ];
  return (
    '<div class="blk-root pos-bottom bg-panel show-target quran-ar"><div class="blk-panel">' +
    `<div class="blk-scroll"><div class="blk-list">${blocks.join("")}</div></div>` +
    // The live page's listening row: invisible while nobody speaks, but it takes its place.
    '<div class="blk-listen" aria-hidden="true"><span class="blk-dots"><i class="blk-dot"></i>' +
    '<i class="blk-dot"></i><i class="blk-dot"></i></span><span class="blk-partial-box">' +
    '<span class="blk-partial" dir="rtl" lang="ar"></span></span></div></div></div>' +
    '<div class="cap-root pos-bottom bg-band" hidden>' +
    '<div class="cap-block cap-source" lang="ar" dir="rtl"><div class="cap-window">' +
    `<div class="cap-text is-arabic"><span class="cap-seg">${escapeHtml(hadith.ar)}</span></div></div></div>` +
    `<div class="cap-block cap-translation" lang="${lang}" dir="ltr"><div class="cap-window">` +
    `<div class="cap-text"><span class="cap-seg">${honHtml(hadith[lang])}</span></div></div></div></div>`
  );
}

/** The fragments of site/pages/home.html in `lang`. */
export function homeFragments(lang: SiteLang): Record<string, string> {
  const d = DICTS[lang];
  const cap = captionLang(lang);
  const attr = (s: string): string => escapeHtml(s);
  return {
    h1: escapeHtml(headlineFor(lang)),
    heroArWords: wordSpans(HEADLINE_AR, "aw"),
    heroLine: escapeHtml(headlineFor(cap)),
    capLang: cap,
    capLangName: escapeHtml(LANG_NAMES[cap] ?? cap),
    pair: `AR → ${cap.toUpperCase()}`,
    screenHall: escapeHtml(SCREEN_WORDS[cap].hall),
    screenLive: escapeHtml(SCREEN_WORDS[cap].live),
    markPine: markSvg(PINE),
    markOnPine: markSvg(ON_PINE),
    lockIcon: LOCK,
    boardCards: MOMENTS.map((m) => {
      const label = eventLabel(m, cap);
      const sub =
        label.subtitle === "" ? "" : `<span class="bc-sub">${escapeHtml(label.subtitle)}</span>`;
      return (
        `<div class="bcard ${m}"><div class="bc-l" lang="${cap}">` +
        `<span class="bc-lat">${escapeHtml(label.title)}</span>${sub}</div>` +
        '<div class="bc-lines"></div></div>'
      );
    }).join(""),
    chapters: CHAPTERS.map(
      (c, k) =>
        `<div class="yt-ch" data-k="${k}" data-name="${attr(d[c.key])}">` +
        '<div class="yt-bar"><i class="yt-fill"></i></div>' +
        `<span class="yt-lab"><span class="mono">${c.label}</span>${escapeHtml(d[c.key])}</span></div>`,
    ).join(""),
    presetChips: BUILTIN_PRESETS.map(
      (p) =>
        `<button type="button" class="cd-chip" data-preset="${attr(p.id)}" ` +
        `aria-pressed="${p.id === DEFAULT_PRESET_ID}">${escapeHtml(presetName(lang, p.id, p.name))}</button>`,
    ).join(""),
    capdemoStage: captionStage(cap),
    verseWords: wordSpans(VERSE.ar, "w"),
    verseText: escapeHtml(VERSE[cap]),
    verseRef: escapeHtml(VERSE.verse?.ref ?? ""),
    screenCards: MOMENTS.map((m) => {
      const label = eventLabel(m, cap);
      const sub =
        label.subtitle === ""
          ? ""
          : `<span class="c-sub" lang="${cap}">${escapeHtml(label.subtitle)}</span>`;
      return (
        `<div class="card ${m}"><span class="c-ar" lang="ar">${escapeHtml(label.ar)}</span>` +
        `<span class="c-lat" lang="${cap}">${escapeHtml(label.title)}</span>${sub}</div>`
      );
    }).join(""),
    momentButtons: MOMENTS.map(
      (m) =>
        `<button type="button" data-moment="${m}" aria-pressed="${m === "iqama"}">` +
        `${escapeHtml(d[MOMENT_KEYS[m]])}</button>`,
    ).join(""),
    commands: commandLines(SELF_HOST_COMMANDS),
  };
}
