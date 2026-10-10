// The real caption CSS (web/shared/blocks.css, rollup.css, hon.css) under a prefix, so the website
// can show a caption page at 1920×1080, scaled down: every selector is prefixed, rules for
// html/body/:root and @import are dropped, fixed positioning becomes absolute, and viewport units
// become container units (the stage is a size container of the screen's size).

/** Remove comments, @import, fixed positioning; vw/vh → cqw/cqh. */
export function adaptCaptionCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;/g, "")
    .replace(/position:\s*fixed/g, "position: absolute")
    .replace(/(\d)vw\b/g, "$1cqw")
    .replace(/(\d)vh\b/g, "$1cqh");
}

const PAGE_SELECTORS: ReadonlySet<string> = new Set(["html", "body", ":root"]);
const NESTED_AT_RULES = /^@(media|supports|container|layer)\b/;

/** Index of the quote that closes the string opening at `start`. */
function stringEnd(css: string, start: number): number {
  const quote = css[start];
  for (let i = start + 1; i < css.length; i++) {
    if (css[i] === "\\") i++;
    else if (css[i] === quote) return i;
  }
  throw new Error("unterminated string in CSS");
}

/** Index just past the block that opens at `open` (a "{"), skipping strings. */
function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") {
      i = stringEnd(css, i);
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error("unbalanced braces in CSS");
}

/** A selector list split on its top-level commas (not those inside :is(), :not(), …). */
export function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  out.push(list.slice(start));
  return out.map((s) => s.trim()).filter((s) => s !== "");
}

/** Prefix every style rule of `css` (comments already removed) with `prefix`. */
export function scopeCss(css: string, prefix: string): string {
  const out: string[] = [];
  let i = 0;
  for (;;) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    // Statements before the rule (@charset …;) are dropped with it.
    const head = css.slice(i, open).split(";").pop()?.trim() ?? "";
    const end = blockEnd(css, open);
    const body = css.slice(open + 1, end - 1);
    i = end;
    if (NESTED_AT_RULES.test(head)) {
      out.push(`${head} {\n${scopeCss(body, prefix)}\n}`);
    } else if (head.startsWith("@")) {
      out.push(`${head} {${body}}`);
    } else {
      const selectors = splitSelectors(head);
      if (selectors.some((s) => PAGE_SELECTORS.has(s))) continue;
      out.push(`${selectors.map((s) => `${prefix} ${s}`).join(",\n")} {${body}}`);
    }
  }
  return out.join("\n");
}

/** The caption stylesheets, adapted and scoped, in the order the caption page loads them. */
export function scopeCaptionCss(
  files: ReadonlyArray<{ name: string; css: string }>,
  prefix: string,
): string {
  return files
    .map((f) => `/* web/shared/${f.name} */\n${scopeCss(adaptCaptionCss(f.css), prefix)}`)
    .join("\n");
}
