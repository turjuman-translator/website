import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captionLanguages } from "../../scripts/build-site.js";
import { type Block, type DocPage, inLang, type Text } from "../../site/content/doc.js";
import { DOC_PAGES } from "../../site/content/docs/index.js";
import { MAKE_HELPERS } from "../../site/content/docs/make.js";
import { CLI_DOC, INSTALL_COMMANDS } from "../../site/content/docs/shared.js";
import { SITE_LANGS, type SiteLang } from "../../site/content/khutbah.js";
import { PAGES, pageById, pagePath, SELF_HOST_PATH } from "../../site/content/pages.js";
import { DICTS } from "../../site/content/strings.js";
import { inline } from "../../site/render/doc.js";
import { ORIGIN_TOKEN, type PageAssets, renderPage } from "../../site/render/page.js";

const read = (file: string): string =>
  readFileSync(new URL(`../../site/${file}`, import.meta.url), "utf8");
const templates = {
  layout: read("layout.html"),
  pages: Object.fromEntries(
    [...new Set(PAGES.map((p) => p.template ?? p.id))].map((n) => [n, read(`pages/${n}.html`)]),
  ),
};
const assets: PageAssets = {
  scripts: { home: "/site-assets/home.js", page: "/site-assets/page.js" },
  style: "/site-assets/site.css",
  icon: "/site-assets/icon.svg",
  iconPng: "/site-assets/favicon-abc.png",
  touchIcon: "/site-assets/touch.png",
  og: { en: "/og-en.png", nl: "/og-nl.png", ar: "/og-ar.png" },
  fonts: [],
};
const languages = await captionLanguages();
const data = { languages };
const render = (id: string, lang: SiteLang, mode: "hosted" | "local" = "hosted"): string =>
  renderPage(templates, pageById(id), lang, assets, mode, data);

/** Every text of a page, in one language (to check what it claims). */
function texts(page: DocPage, lang: SiteLang): string[] {
  const out: string[] = [];
  const add = (t: Text | undefined): void => {
    if (t !== undefined) out.push(inLang(t, lang));
  };
  const block = (b: Block): void => {
    if ("p" in b) add(b.p);
    else if ("ul" in b) b.ul.forEach(add);
    else if ("ol" in b)
      for (const x of b.ol) {
        if (typeof x === "object" && "blocks" in x) {
          add(x.text);
          x.blocks.forEach(block);
        } else add(x);
      }
    else if ("table" in b) for (const r of b.table.rows) r.forEach(add);
    else if ("dl" in b) for (const [k, v] of b.dl) [k, v].forEach(add);
    else if ("note" in b) add(b.note);
    else if ("faq" in b) for (const f of b.faq) [f.q, f.a].forEach(add);
    else if ("cards" in b) for (const c of b.cards) [c.title, c.text].forEach(add);
    else if ("flow" in b) for (const f of b.flow) [f.title, f.text].forEach(add);
    else if ("cmds" in b) for (const c of b.cmds) add(c.text);
    else if ("helpers" in b) for (const h of b.helpers) add(h.text);
  };
  [page.title, page.desc, page.h1, page.lead].forEach(add);
  for (const s of page.sections) {
    add(s.h2);
    s.blocks.forEach(block);
  }
  return out;
}

describe("site: the text pages", () => {
  const ids = Object.keys(DOC_PAGES);

  it("are the sitemap's pages, each with its template", () => {
    expect(ids.sort()).toEqual(
      [
        "commands",
        "docker",
        "how-it-works",
        "install",
        "network",
        "not-found",
        "security",
        "self-host",
        "show-on-a-screen",
      ].sort(),
    );
    for (const id of ids) expect(pageById(id).template).toBe("doc");
  });

  for (const id of ids.filter((x) => x !== "not-found")) {
    describe(id, () => {
      for (const lang of SITE_LANGS) {
        const html = render(id, lang);

        it(`${lang}: has its title, its heading and its own address in every language`, () => {
          const doc = DOC_PAGES[id] as DocPage;
          expect(html).toContain(
            `<title>${inline(inLang(doc.title, lang), { resolve: (t) => t, lang })}</title>`,
          );
          expect(html).toMatch(/<h1 class="doc-h1">[^<]/);
          expect(html).toContain(
            `<link rel="canonical" href="${ORIGIN_TOKEN}${pagePath("hosted", lang, pageById(id).slug)}">`,
          );
          for (const l of SITE_LANGS) {
            expect(html).toContain(
              `hreflang="${l}" href="${ORIGIN_TOKEN}${pagePath("hosted", l, pageById(id).slug)}"`,
            );
          }
          expect(html).toContain(`<script type="module" src="${assets.scripts.page}"></script>`);
        });

        it(`${lang}: gives every command block its own Copy button, left to right`, () => {
          const blocks = [...html.matchAll(/<pre class="code[^"]*" id="([^"]+)" dir="ltr">/g)];
          const ids = blocks.map((m) => m[1]);
          expect(new Set(ids).size).toBe(ids.length);
          for (const m of html.matchAll(/<pre class="code( plain)?" id="([^"]+)"/g)) {
            expect(html).toContain(`data-copy="${m[2]}"`);
          }
          for (const m of html.matchAll(/<code([^>]*)>/g)) expect(m[1]).toContain('dir="ltr"');
        });

        if (lang !== "en") {
          it(`${lang}: marks links to the English documents on GitHub`, () => {
            for (const m of html.matchAll(
              /<a href="https:\/\/github\.com\/[^"]+\/blob\/[^"]+"([^>]*)>/g,
            )) {
              expect(m[1]).toContain('hreflang="en"');
            }
          });
        }
      }

      it("has the stepper and the previous/next links when it is on the self-host path", () => {
        const html = render(id, "en");
        const onPath = SELF_HOST_PATH.includes(id);
        expect(html.includes('<nav class="stepper"')).toBe(onPath);
        expect(html.includes('<nav class="pager"')).toBe(onPath);
        if (onPath) expect(html).toContain('aria-current="step"');
      });
    });
  }

  it("follow the self-host path with previous and next", () => {
    const html = render("install", "nl");
    expect(html).toContain(
      `<a class="pg pg-prev" href="${pagePath("hosted", "nl", "self-host")}" rel="prev">`,
    );
    expect(html).toContain(
      `<a class="pg pg-next" href="${pagePath("hosted", "nl", "network")}" rel="next">`,
    );
    expect(render("commands", "en")).not.toContain("pg-next");
    // Show on a screen is shared by hosted and self-hosted mosques: not a step, but linked.
    expect(SELF_HOST_PATH).not.toContain("show-on-a-screen");
    expect(html).toContain(`href="${pagePath("hosted", "nl", "show-on-a-screen")}"`);
    expect(render("self-host", "en")).toContain(
      `href="${pagePath("hosted", "en", "show-on-a-screen")}"`,
    );
  });

  it("break a long command only after a slash or at a space, and keep OBS names apart", () => {
    for (const lang of SITE_LANGS) {
      const html = render("show-on-a-screen", lang);
      expect(html).toContain(
        '<code dir="ltr"><span class="nb">/Applications/</span><wbr><span class="nb">OBS.app/</span><wbr>' +
          '<span class="nb">Contents/</span><wbr><span class="nb">MacOS/</span><wbr><span class="nb">OBS</span> ' +
          '<span class="nb">--enable-media-stream</span></code>',
      );
      // the two options of step 3, each on its own line
      expect(html).toMatch(
        /<li><strong>[^<]*Shutdown source when not visible[^<]*<\/strong><\/li>/,
      );
      expect(html).toMatch(
        /<li><strong>[^<]*Refresh browser when scene becomes active[^<]*<\/strong><\/li>/,
      );
    }
  });

  it("mark Self-host as the section in the nav on its pages, and the page itself as the page", () => {
    const self = (html: string): string =>
      /<nav class="links"[^>]*>(.*?)<\/nav>/.exec(html)?.[1] ?? "";
    expect(self(render("install", "en"))).toContain('<a href="/self-host" aria-current="true">');
    expect(self(render("self-host", "en"))).toContain('<a href="#top" aria-current="page">');
    expect(self(render("how-it-works", "en"))).toContain('<a href="#top" aria-current="page">');
    expect(self(render("show-on-a-screen", "en"))).not.toContain("aria-current");
  });

  it("give the 404 page no address: not indexed, the language switch leads home", () => {
    for (const lang of SITE_LANGS) {
      const html = render("not-found", lang);
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toContain('rel="alternate"');
      expect(html).toContain(`<a href="${pagePath("hosted", "nl", "")}" hreflang="nl"`);
      expect(html).toContain(
        `<h1 class="doc-h1">${inLang(DOC_PAGES["not-found"]?.h1 ?? "", lang)}</h1>`,
      );
    }
  });

  it("list the 60 languages Turjuman hears and translates, each in its own name", () => {
    expect(languages).toHaveLength(60);
    const html = render("how-it-works", "ar");
    expect(html).toContain('<li lang="ar"><bdi>العربية</bdi></li>');
    expect(html).toContain('<li lang="nl"><bdi>Nederlands</bdi></li>');
    expect([...html.matchAll(/<li lang="[a-z]+"><bdi>/g)]).toHaveLength(60);
  });

  it("show the install steps of the self-hosted edition (the server gets the Quran data itself)", () => {
    expect(INSTALL_COMMANDS).toEqual([
      "git clone https://github.com/turjuman-translator/cli.git turjuman",
      "cd turjuman",
      "pnpm install && pnpm build",
    ]);
    const html = render("install", "en").replace(/<[^>]+>/g, "");
    for (const c of [
      ...INSTALL_COMMANDS,
      "pnpm turjuman setup",
      "pnpm turjuman start",
      "pnpm turjuman doctor",
    ]) {
      expect(html).toContain(c.replaceAll("&", "&amp;"));
    }
  });

  it("list every turjuman command and make helper, with docs/cli.md for every option", () => {
    const html = render("commands", "en");
    const names = [...html.matchAll(/<h3 class="cmd-name"><code dir="ltr">([^<]+)<\/code>/g)].map(
      (m) => m[1],
    );
    expect(names).toEqual([
      "setup",
      "start",
      "open",
      "doctor",
      "screens list",
      "screens add",
      "screens url",
      "screens enable · disable",
      "screens rm",
      "users",
      "keys · usage",
      "orgs",
    ]);
    // `make site` is not in the self-hosted edition (scripts/export-selfhost.ts removes it).
    expect(MAKE_HELPERS.map((h) => h.cmd.split(" ").slice(1).join(" "))).toEqual([
      "up",
      "down",
      "restart",
      "admin",
      "keys",
      "status",
      "logs",
      "screens",
      "users",
      "quran-data",
      "update",
      "backup",
      "doctor",
      "doctor ONLINE=1",
      'cli ARGS="screens enable <id>"',
      "lan-cert",
      "help",
    ]);
    // Every helper is a target of the Makefile.
    const makefile = readFileSync(new URL("../../Makefile", import.meta.url), "utf8");
    for (const h of MAKE_HELPERS) {
      expect(makefile).toMatch(new RegExp(`^${h.cmd.split(" ")[1]}:`, "m"));
    }
    expect(
      [...html.matchAll(/class="cmd-more" href="([^"]+)"/g)].every(
        (m) => (m[1] ?? "").startsWith(CLI_DOC) || (m[1] ?? "").includes("hosting.md"),
      ),
    ).toBe(true);
  });

  it("say what the code does, no more: Quran translations, Allah, backups", () => {
    for (const [id, page] of Object.entries(DOC_PAGES)) {
      const en = texts(page, "en").join(" ");
      // An approved translation is configured for Dutch only.
      for (const sentence of en.split(/(?<=[.!?])\s/)) {
        if (/approved/i.test(sentence))
          expect([id, sentence]).toEqual([id, expect.stringMatching(/Dutch|Siregar/)]);
        if (/never “God”/.test(sentence)) expect(sentence).toContain("Dutch and English");
      }
      // Turjuman uses Soniox only: no page mentions Gemini or what came with it.
      for (const lang of SITE_LANGS) {
        const all = texts(page, lang).join(" ");
        expect(all, `${id} (${lang})`).not.toMatch(/Gemini|aistudio|\bLLM\b|composer/i);
      }
    }
    const backup = texts(DOC_PAGES.docker as DocPage, "en").join(" ");
    expect(backup).toContain("`config/master.key`");
    expect(backup).toMatch(/Keep a copy of the master key somewhere else/);
  });

  it("have every text in every language (only a deliberate English blank)", () => {
    for (const [id, page] of Object.entries(DOC_PAGES)) {
      for (const lang of SITE_LANGS) {
        const blank = texts(page, lang).filter((t) => t.trim() === "");
        // the note that device menus are named in English is not needed on the English page
        expect([id, lang, blank.length]).toEqual([
          id,
          lang,
          lang === "en" && id === "network" ? 1 : 0,
        ]);
      }
    }
    for (const lang of SITE_LANGS) expect(DICTS[lang].onThisPage.trim()).not.toBe("");
  });

  it("turn `code`, **bold** and [links](page:…) into HTML, escaping the rest", () => {
    const html = inline("Run `a <b>` and **this**, see [Install](page:install#keys) & more", {
      lang: "nl",
      resolve: (t) => (t === "page:install#keys" ? "/nl/install#keys" : t),
    });
    expect(html).toBe(
      'Run <code dir="ltr" class="nb">a &lt;b&gt;</code> and <strong>this</strong>, see ' +
        '<a href="/nl/install#keys">Install</a> &amp; more',
    );
    expect(inline("[x](https://github.com/a/b)", { lang: "ar", resolve: (t) => t })).toBe(
      '<a href="https://github.com/a/b" hreflang="en">x</a>',
    );
  });
});
