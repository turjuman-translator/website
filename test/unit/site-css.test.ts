import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  adaptCaptionCss,
  scopeCaptionCss,
  scopeCss,
  splitSelectors,
} from "../../site/render/scope-css.js";

const P = ".stage";

describe("site: scoping the caption CSS", () => {
  it("prefixes every selector of a rule", () => {
    expect(scopeCss(".a, .b > .c {color: red}", P)).toBe(".stage .a,\n.stage .b > .c {color: red}");
  });

  it("splits selector lists on top-level commas only", () => {
    expect(splitSelectors(".a:not(.b, .c), .d[data-x='1,2']")).toEqual([
      ".a:not(.b, .c)",
      ".d[data-x='1,2']",
    ]);
  });

  it("scopes inside @media and keeps @keyframes and @font-face as they are", () => {
    const css =
      "@media (max-width: 9px) {.a {top: 0}}\n@keyframes k {from {opacity: 0} to {opacity: 1}}";
    const out = scopeCss(css, P);
    expect(out).toContain("@media (max-width: 9px) {\n.stage .a {top: 0}\n}");
    expect(out).toContain("@keyframes k {from {opacity: 0} to {opacity: 1}}");
  });

  it("drops the page's own rules (html, body, :root) and @import", () => {
    const css = adaptCaptionCss('@import "../fonts.css";\nhtml,\nbody {margin: 0}\n.a {top: 0}');
    expect(scopeCss(css, P)).toBe(".stage .a {top: 0}");
  });

  it("turns viewport units into container units and fixed into absolute", () => {
    const out = adaptCaptionCss(
      ".a {position: fixed; width: min(96vw, 10px); height: 100vh} /* 5vw */",
    );
    expect(out).toBe(".a {position: absolute; width: min(96cqw, 10px); height: 100cqh} ");
  });

  it("is not fooled by braces or quotes inside strings", () => {
    expect(scopeCss('.a::before {content: "}\\"{"}', P)).toBe(
      '.stage .a::before {content: "}\\"{"}',
    );
  });

  it("scopes the real caption stylesheets completely", () => {
    const files = ["blocks.css", "rollup.css", "hon.css"].map((name) => ({
      name,
      css: readFileSync(new URL(`../../web/shared/${name}`, import.meta.url), "utf8"),
    }));
    const out = scopeCaptionCss(files, ".capdemo-stage");
    expect(out).not.toMatch(/\d(vw|vh)\b/);
    expect(out).not.toMatch(/position:\s*fixed/);
    expect(out).not.toContain("@import");
    expect(out).toContain(".capdemo-stage .blk-root");
    expect(out).toContain(".capdemo-stage .cap-hon");
    // Every rule outside @keyframes is scoped (no bare html/body/.class selector is left).
    const withoutKeyframes = out
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
    const preludes = [...withoutKeyframes.matchAll(/(^|[{}])\s*([^{}@]+)\{/g)].map((m) =>
      (m[2] ?? "").trim(),
    );
    expect(preludes.length).toBeGreaterThan(40);
    for (const prelude of preludes) {
      for (const sel of splitSelectors(prelude))
        expect(sel.startsWith(".capdemo-stage ")).toBe(true);
    }
  });
});
