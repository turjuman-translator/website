// The shape of the website's text pages (How it works, the self-host section, …). Every text is
// written in English, Dutch and Arabic side by side (`L(en, nl, ar)`), so the three languages
// always have the same structure; commands, code and names are plain strings, the same in all.
// Inline text may use `code`, **bold** and [a link](target), where a target is a page
// ("page:install", "page:network#https"), the app ("app:start", "app:login"), a place on the
// same page ("#faq") or an https:// address (see site/render/doc.ts).
import type { SiteLang } from "./khutbah.js";

export type Tri = Readonly<Record<SiteLang, string>>;
/** Text in the three languages, or one text for all (code, names). */
export type Text = Tri | string;

export function L(en: string, nl: string, ar: string): Tri {
  return { en, nl, ar };
}

/**
 * In Arabic text: an English name (a menu, an option) kept left to right as one piece, so its
 * punctuation stays with it (invisible Unicode isolate marks, U+2066 … U+2069).
 */
export function ltr(text: string): string {
  return `⁦${text}⁩`;
}

export function inLang(t: Text, lang: SiteLang): string {
  return typeof t === "string" ? t : t[lang];
}

export type Block =
  | { p: Text }
  /** A bulleted list. */
  | { ul: readonly Text[] }
  /** Numbered steps; a step may carry blocks of its own (a command, a list). */
  | { ol: readonly (Text | { text: Text; blocks: readonly Block[] })[] }
  /** Shell commands (copyable, with a "$" prompt), or other text such as output or YAML. */
  | { code: readonly string[]; kind?: "shell" | "yaml" | "output" }
  | { table: { head?: readonly Text[]; rows: readonly (readonly Text[])[] } }
  /** Label → text rows, for things that differ per system or device. */
  | { dl: readonly (readonly [Text, Text])[] }
  | { note: Text }
  /** Links to other pages, each with a line. */
  | { cards: readonly { to: string; title: Text; text: Text }[] }
  /** Questions that open (details/summary). */
  | { faq: readonly { q: Text; a: Text }[] }
  /** The way of the audio, step by step. */
  | { flow: readonly { title: Text; text: Text }[] }
  /** The languages Turjuman hears and translates (built from languages.yaml). */
  | { langs: true }
  | { actions: readonly { to: string; label: Text; primary?: boolean }[] }
  /** Commands of the CLI: name, one line, examples, and where every option is. */
  | { cmds: readonly { name: string; text: Text; examples: readonly string[]; more: string }[] }
  /** One-line helpers (make targets), each copyable. */
  | { helpers: readonly { cmd: string; text: Text }[] };

export interface DocSection {
  /** The section's id (English in every language, so links work across languages). */
  id: string;
  h2: Text;
  /** Shown as a number before the heading (the steps of Install). */
  n?: number;
  blocks: readonly Block[];
}

export interface DocPage {
  /** The <title> and the description of the page (meta, Open Graph). */
  title: Text;
  desc: Text;
  h1: Text;
  lead?: Text;
  actions?: readonly { to: string; label: Text; primary?: boolean }[];
  sections: readonly DocSection[];
}
