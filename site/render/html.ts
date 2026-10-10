// HTML helpers of the page build: escaping and the {{name}} templates.

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Escaped words in spans of `cls`, separated by spaces (the demos light them up one by one). */
export function wordSpans(text: string, cls: string): string {
  return text
    .split(/\s+/)
    .filter((w) => w !== "")
    .map((w) => `<span class="${cls}">${escapeHtml(w)}</span>`)
    .join(" ");
}

/** Fill `template`'s {{name}} placeholders; unknown names are an error. */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`site template: unknown placeholder {{${name}}}`);
    return value;
  });
}

/** Dictionary text, escaped, plus HTML fragments; a name may not be both. */
export function mergeValues(
  words: Readonly<Record<string, string>>,
  fragments: Readonly<Record<string, string>>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, text] of Object.entries(words)) {
    if (key in fragments) throw new Error(`site: "${key}" is both a word and a fragment`);
    values[key] = escapeHtml(text);
  }
  return { ...values, ...fragments };
}

/** Code that may wrap only between words and after a slash (never at a hyphen inside
 *  `--soniox-key-file`, never inside a name); the text itself, and so what is copied, stays the
 *  same. */
export function codeWords(text: string): string {
  return text
    .split(/( +)/)
    .map((w) => {
      if (/^ +$/.test(w) || w === "") return w;
      const parts = w.split(/(?<=.\/)(?!\/)/);
      return parts.map((part) => `<span class="nb">${escapeHtml(part)}</span>`).join("<wbr>");
    })
    .join("");
}

/** One line of a command block (see codeWords). */
export function codeLine(line: string): string {
  return `<span class="ln">${codeWords(line)}</span>`;
}
