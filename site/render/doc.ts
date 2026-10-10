// Renders the text pages (site/content/doc.ts) into the fragments of site/pages/doc.html: the
// heading, the sections, the self-host stepper and the previous/next links. Inline text knows
// `code`, **bold** and [links](target); everything else is escaped. Commands and code are always
// left-to-right (also on the Arabic page) and every command block has a Copy button.
import { type Block, type DocPage, type DocSection, inLang, type Text } from "../content/doc.js";
import type { SiteLang } from "../content/khutbah.js";
import { PAGES, SELF_HOST_PATH } from "../content/pages.js";
import { DICTS } from "../content/strings.js";
import { codeLine, codeWords, escapeHtml } from "./html.js";

/** A link target of the text pages ("page:install#keys", "app:start", "#make", https://…). */
export type Resolve = (target: string) => string;

export interface DocContext {
  lang: SiteLang;
  pageId: string;
  resolve: Resolve;
  /** The languages for the grid: each in its own name (languages.yaml, Soniox entries). */
  languages: readonly { code: string; native: string }[];
}

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Inline markup to HTML. External links to GitHub (English documents) get hreflang="en". */
export function inline(text: string, ctx: Pick<DocContext, "resolve" | "lang">): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    out += escapeHtml(text.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    const [, code, bold, label, target] = m;
    // A short piece of code never breaks (not after the "--" of an option); a long one, such as
    // a path, only between words and after a slash.
    if (code !== undefined) {
      out +=
        code.length <= 32
          ? `<code dir="ltr" class="nb">${escapeHtml(code)}</code>`
          : `<code dir="ltr">${codeWords(code)}</code>`;
    } else if (bold !== undefined) out += `<strong>${inline(bold, ctx)}</strong>`;
    else if (label !== undefined && target !== undefined) {
      const href = ctx.resolve(target);
      const en = ctx.lang !== "en" && /^https:\/\/github\.com\//.test(href) ? ' hreflang="en"' : "";
      out += `<a href="${escapeHtml(href)}"${en}>${inline(label, ctx)}</a>`;
    }
  }
  return out + escapeHtml(text.slice(last));
}

class Renderer {
  private codes = 0;

  constructor(private readonly ctx: DocContext) {}

  t(text: Text): string {
    return inline(inLang(text, this.ctx.lang), this.ctx);
  }

  private copyButton(id: string): string {
    const d = DICTS[this.ctx.lang];
    return (
      `<button type="button" class="copy" data-copy="${id}" data-copied="${escapeHtml(d.copied)}">` +
      `${escapeHtml(d.copy)}</button><span class="vh" role="status"></span>`
    );
  }

  code(lines: readonly string[], kind: "shell" | "yaml" | "output" = "shell"): string {
    const id = `code-${this.ctx.pageId}-${++this.codes}`;
    const cls = `code${kind === "shell" ? "" : " plain"}${kind === "output" ? " nocopy" : ""}`;
    const pre = `<pre class="${cls}" id="${id}" dir="ltr">${lines.map(codeLine).join("")}</pre>`;
    return `<div class="codebox">${pre}${kind === "output" ? "" : this.copyButton(id)}</div>`;
  }

  block(b: Block): string {
    if ("p" in b) {
      const text = inLang(b.p, this.ctx.lang);
      return text === "" ? "" : `<p>${inline(text, this.ctx)}</p>`;
    }
    if ("ul" in b)
      return `<ul class="bullets">${b.ul.map((x) => `<li>${this.t(x)}</li>`).join("")}</ul>`;
    if ("ol" in b) {
      const items = b.ol.map((x) =>
        typeof x === "object" && "blocks" in x
          ? `<li><p>${this.t(x.text)}</p>${x.blocks.map((y) => this.block(y)).join("")}</li>`
          : `<li><p>${this.t(x)}</p></li>`,
      );
      return `<ol class="steps">${items.join("")}</ol>`;
    }
    if ("code" in b) return this.code(b.code, b.kind);
    if ("table" in b) {
      const head =
        b.table.head === undefined
          ? ""
          : `<thead><tr>${b.table.head.map((h) => `<th scope="col">${this.t(h)}</th>`).join("")}</tr></thead>`;
      // On a phone each row stacks; a cell keeps its column's name (data-label).
      const labels = (b.table.head ?? []).map((h) => inLang(h, this.ctx.lang).replace(/[`*]/g, ""));
      const td = (c: Text, i: number): string => {
        const label = labels[i] ?? "";
        return `<td${label === "" ? "" : ` data-label="${escapeHtml(label)}"`}>${this.t(c)}</td>`;
      };
      const rows = b.table.rows
        .map(
          (r) =>
            `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${this.t(c)}</th>` : td(c, i))).join("")}</tr>`,
        )
        .join("");
      const cls = b.table.head === undefined ? "table rows" : "table";
      return `<div class="table-wrap"><table class="${cls}">${head}<tbody>${rows}</tbody></table></div>`;
    }
    if ("dl" in b) {
      return `<dl class="dl">${b.dl.map(([k, v]) => `<div><dt>${this.t(k)}</dt><dd>${this.t(v)}</dd></div>`).join("")}</dl>`;
    }
    if ("note" in b) return `<p class="note">${this.t(b.note)}</p>`;
    if ("cards" in b) {
      const cards = b.cards.map(
        (c) =>
          `<li><a class="doc-card" href="${escapeHtml(this.ctx.resolve(c.to))}">` +
          `<span class="doc-card-t">${this.t(c.title)}<i class="arr" aria-hidden="true"></i></span>` +
          `<span class="doc-card-p">${this.t(c.text)}</span></a></li>`,
      );
      return `<ul class="doc-cards">${cards.join("")}</ul>`;
    }
    if ("faq" in b) {
      return `<div class="faq">${b.faq
        .map((f) => `<details><summary>${this.t(f.q)}</summary><p>${this.t(f.a)}</p></details>`)
        .join("")}</div>`;
    }
    if ("flow" in b) {
      return `<ol class="flow">${b.flow
        .map(
          (s) =>
            `<li><span class="flow-t">${this.t(s.title)}</span><span class="flow-p">${this.t(s.text)}</span></li>`,
        )
        .join("")}</ol>`;
    }
    if ("langs" in b) {
      return `<ul class="lang-grid">${this.ctx.languages
        .map((l) => `<li lang="${escapeHtml(l.code)}"><bdi>${escapeHtml(l.native)}</bdi></li>`)
        .join("")}</ul>`;
    }
    if ("actions" in b) return this.actions(b.actions);
    if ("cmds" in b) {
      const d = DICTS[this.ctx.lang];
      return b.cmds
        .map(
          (c) =>
            `<div class="cmd"><div class="cmd-head"><h3 class="cmd-name"><code dir="ltr">${escapeHtml(c.name)}</code></h3>` +
            `<a class="cmd-more" href="${escapeHtml(c.more)}"${this.ctx.lang === "en" ? "" : ' hreflang="en"'}>` +
            `${escapeHtml(d.allOptions)}</a></div>` +
            `<p>${this.t(c.text)}</p>${this.code(c.examples)}</div>`,
        )
        .join("");
    }
    // The last kind of block: make helpers.
    const rows = b.helpers.map((h) => {
      const id = `code-${this.ctx.pageId}-${++this.codes}`;
      return (
        `<li><span class="hp-cmd"><code id="${id}" dir="ltr">${escapeHtml(h.cmd)}</code>` +
        `${this.copyButton(id)}</span><span class="hp-text">${this.t(h.text)}</span></li>`
      );
    });
    return `<ul class="helpers">${rows.join("")}</ul>`;
  }

  actions(list: readonly { to: string; label: Text; primary?: boolean }[]): string {
    return `<div class="ctas">${list
      .map(
        (a) =>
          `<a class="btn ${a.primary ? "primary" : "secondary"}" href="${escapeHtml(this.ctx.resolve(a.to))}">${this.t(a.label)}</a>`,
      )
      .join("")}</div>`;
  }

  section(s: DocSection): string {
    const n = s.n === undefined ? "" : `<span class="sec-n" aria-hidden="true">${s.n}</span>`;
    return (
      `<section class="doc-sec" id="${escapeHtml(s.id)}" aria-labelledby="${escapeHtml(s.id)}-h">` +
      `<h2 class="doc-h2" id="${escapeHtml(s.id)}-h">${n}${this.t(s.h2)}</h2>` +
      `${s.blocks.map((b) => this.block(b)).join("")}</section>`
    );
  }
}

/** The step names of the self-host path, in this language. */
const STEP_NAMES: Readonly<Record<string, keyof (typeof DICTS)["en"]>> = {
  "self-host": "pg_self",
  install: "pg_install",
  network: "pg_network",
  docker: "pg_docker",
  commands: "pg_commands",
};

function stepName(id: string, lang: SiteLang): string {
  const key = STEP_NAMES[id];
  return key === undefined ? id : DICTS[lang][key];
}

/** The self-host stepper: the current step is marked. */
export function stepperHtml(ctx: DocContext): string {
  const d = DICTS[ctx.lang];
  const items = SELF_HOST_PATH.map((id, i) => {
    const current = id === ctx.pageId ? ' aria-current="step"' : "";
    return (
      `<li><a href="${escapeHtml(ctx.resolve(`page:${id}`))}"${current}>` +
      `<span class="st-n" aria-hidden="true">${i + 1}</span>${escapeHtml(stepName(id, ctx.lang))}</a></li>`
    );
  });
  return `<nav class="stepper" aria-label="${escapeHtml(d.stepperLabel)}"><ol>${items.join("")}</ol></nav>`;
}

/** Previous and next along the self-host path. */
export function pagerHtml(ctx: DocContext): string {
  const d = DICTS[ctx.lang];
  const i = SELF_HOST_PATH.indexOf(ctx.pageId);
  if (i === -1) return "";
  const link = (id: string | undefined, dir: "prev" | "next"): string => {
    if (id === undefined) return "<span></span>";
    return (
      `<a class="pg pg-${dir}" href="${escapeHtml(ctx.resolve(`page:${id}`))}" rel="${dir}">` +
      (dir === "prev"
        ? `<span class="pg-l"><i class="arr back" aria-hidden="true"></i>${escapeHtml(d.prev)}</span>`
        : `<span class="pg-l">${escapeHtml(d.next)}<i class="arr" aria-hidden="true"></i></span>`) +
      `<span class="pg-t">${escapeHtml(stepName(id, ctx.lang))}</span></a>`
    );
  };
  return (
    `<nav class="pager" aria-label="${escapeHtml(d.pagerLabel)}">` +
    `${link(SELF_HOST_PATH[i - 1], "prev")}${link(SELF_HOST_PATH[i + 1], "next")}</nav>`
  );
}

/** "On this page": the sections of a longer page, beside it on a wide screen. */
export function tocHtml(page: DocPage, ctx: DocContext): string {
  if (page.sections.length < 3) return "";
  const d = DICTS[ctx.lang];
  const r = new Renderer(ctx);
  const items = page.sections.map(
    (s) => `<li><a href="#${escapeHtml(s.id)}">${r.t(s.h2).replace(/<\/?a\b[^>]*>/g, "")}</a></li>`,
  );
  return (
    `<aside class="toc"><nav aria-label="${escapeHtml(d.onThisPage)}">` +
    `<p class="toc-h">${escapeHtml(d.onThisPage)}</p><ol>${items.join("")}</ol></nav></aside>`
  );
}

/** The fragments of site/pages/doc.html for `page` in `ctx.lang`. */
export function docFragments(page: DocPage, ctx: DocContext): Record<string, string> {
  const r = new Renderer(ctx);
  const path = PAGES.find((p) => p.id === ctx.pageId)?.path === true;
  return {
    toc: tocHtml(page, ctx),
    docH1: r.t(page.h1),
    docLead: page.lead === undefined ? "" : `<p class="doc-lead">${r.t(page.lead)}</p>`,
    docActions: page.actions === undefined ? "" : r.actions(page.actions),
    docBody: page.sections.map((s) => r.section(s)).join(""),
    stepper: path ? stepperHtml(ctx) : "",
    pager: path ? pagerHtml(ctx) : "",
  };
}
