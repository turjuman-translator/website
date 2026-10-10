// The controls of the text pages (and the home page's command block): every Copy button, "On
// this page", the self-host stepper and the previous/next links, and the questions that open.
import type { Page } from "playwright-core";
import { describe, test } from "vitest";
import type { Block } from "../../../site/content/doc.js";
import { DOC_PAGES } from "../../../site/content/docs/index.js";
import { SELF_HOST_COMMANDS } from "../../../site/content/links.js";
import { SELF_HOST_PATH } from "../../../site/content/pages.js";
import { DICTS } from "../../../site/content/strings.js";
import {
  inPage,
  openSitePage,
  pathOf,
  type Site,
  type SiteLang,
  type SiteMode,
  waitFor,
} from "../helpers/website.js";
import { boxOf, countOf, isShown, textOf } from "../helpers/website-dom.js";

/** What each Copy button of a text page copies, by the id of its source (code-<page>-<n>): the
 *  page's commands, in the order the page shows them (site/content/docs). */
function expectedCopies(pageId: string): Map<string, string> {
  const out = new Map<string, string>();
  let n = 0;
  const walk = (blocks: readonly Block[]): void => {
    for (const b of blocks) {
      if ("code" in b) {
        n++;
        if (b.kind !== "output") out.set(`code-${pageId}-${n}`, b.code.join("\n"));
      } else if ("cmds" in b) {
        for (const c of b.cmds) out.set(`code-${pageId}-${++n}`, c.examples.join("\n"));
      } else if ("helpers" in b) {
        for (const h of b.helpers) out.set(`code-${pageId}-${++n}`, h.cmd);
      } else if ("ol" in b) {
        for (const item of b.ol)
          if (typeof item === "object" && "blocks" in item) walk(item.blocks);
      }
    }
  };
  for (const s of DOC_PAGES[pageId]?.sections ?? []) walk(s.blocks);
  return out;
}

/** The Copy buttons of the page: the id of what each copies, and its label. */
function copyButtons(page: Page): Promise<Array<{ id: string; label: string; copied: string }>> {
  return inPage(
    page,
    `() => [...document.querySelectorAll("button[data-copy]")].map((b) => ({
      id: b.dataset.copy,
      label: b.textContent,
      copied: b.dataset.copied,
    }))`,
  );
}

const readClipboard = (page: Page): Promise<string> =>
  page.evaluate<string>("navigator.clipboard.readText()");

export function textPagesSuite(site: () => Site): void {
  describe.concurrent("the text pages' controls", () => {
    test("every Copy button copies its commands, one per line, without the prompts", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      const tab = await openSitePage(site().browser, { clipboard: origin });
      const { page } = tab;
      try {
        const pages: Array<[SiteLang, string]> = [
          ["en", "home"],
          ...SELF_HOST_PATH.map((id): [SiteLang, string] => ["en", id]),
          ["ar", "install"],
          ["nl", "commands"],
        ];
        let total = 0;
        for (const [lang, id] of pages) {
          await tab.goto(`${origin}${pathOf("hosted", lang, id)}`);
          const buttons = await copyButtons(page);
          const expected =
            id === "home"
              ? new Map([["commands", SELF_HOST_COMMANDS.join("\n")]])
              : expectedCopies(id);
          expect(
            buttons.map((b) => b.id),
            `${lang}/${id}: a button for every command block`,
          ).toEqual([...expected.keys()]);
          for (const [i, b] of buttons.entries()) {
            const where = `${lang}/${id} #${b.id}`;
            expect([b.label, b.copied], where).toEqual([DICTS[lang].copy, DICTS[lang].copied]);
            await page.evaluate("navigator.clipboard.writeText('(nothing copied)')");
            await page.locator("button[data-copy]").nth(i).click();
            await waitFor(
              page,
              `document.querySelectorAll("button[data-copy]")[${i}].textContent === ${JSON.stringify(b.copied)}`,
              `${where} says it copied`,
            );
            expect(await readClipboard(page), where).toBe(expected.get(b.id));
            // Screen readers hear it through the status next to the button.
            expect(
              await inPage(
                page,
                "(i) => document.querySelectorAll('button[data-copy]')[i].parentElement.querySelector('[role=status]').textContent",
                i,
              ),
              where,
            ).toBe(b.copied);
            total++;
          }
        }
        expect(total).toBeGreaterThan(40);
        // The label comes back after a moment.
        await waitFor(
          page,
          `[...document.querySelectorAll("button[data-copy]")].every((b) => b.textContent === ${JSON.stringify(DICTS.nl.copy)})`,
          "the Copy labels come back",
          5000,
        );
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("On this page marks the section being read, and its links go there", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      for (const [lang, id] of [
        ["en", "install"],
        ["ar", "security"],
      ] as const satisfies ReadonlyArray<readonly [SiteLang, string]>) {
        const tab = await openSitePage(site().browser);
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf("hosted", lang, id)}`);
          expect(await isShown(page, ".toc"), `${lang}/${id}`).toBe(true);
          expect(await textOf(page, ".toc-h")).toBe(DICTS[lang].onThisPage);
          const sections = DOC_PAGES[id]?.sections.map((s) => s.id) ?? [];
          expect(
            await inPage(
              page,
              "() => [...document.querySelectorAll('.toc a')].map((a) => a.getAttribute('href'))",
            ),
          ).toEqual(sections.map((s) => `#${s}`));
          for (const target of [sections[2], sections.at(-2)]) {
            const link = page.locator(`.toc a[href="#${target}"]`);
            await link.click();
            await page.waitForURL(`${origin}${pathOf("hosted", lang, id)}#${target}`);
            await waitFor(
              page,
              `document.querySelector('.toc a[href="#${target}"]').getAttribute("aria-current") === "true"`,
              `#${target} is marked`,
            );
            expect(
              await countOf(page, '.toc a[aria-current="true"]'),
              `${lang}/${id}#${target}`,
            ).toBe(1);
            const heading = await boxOf(page, `#${target}`);
            expect(heading?.top ?? -1, `#${target} is near the top`).toBeGreaterThanOrEqual(-2);
            expect(heading?.top ?? 999, `#${target} is near the top`).toBeLessThan(400);
          }
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
      // A phone has no room for it beside the text.
      const phone = await openSitePage(site().browser, { mobile: true });
      try {
        await phone.goto(`${origin}${pathOf("hosted", "en", "install")}`);
        expect(await isShown(phone.page, ".toc")).toBe(false);
      } finally {
        await phone.close();
      }
    });

    test("the stepper and the previous and next links walk the self-host path in order", async ({
      expect,
    }) => {
      for (const [mode, lang] of [
        ["hosted", "en"],
        ["local", "ar"],
      ] as const satisfies ReadonlyArray<readonly [SiteMode, SiteLang]>) {
        const origin = site().server(mode).url;
        const d = DICTS[lang];
        const names = [d.pg_self, d.pg_install, d.pg_network, d.pg_docker, d.pg_commands];
        const tab = await openSitePage(site().browser);
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf(mode, lang, SELF_HOST_PATH[0] ?? "")}`);
          for (const [i, id] of SELF_HOST_PATH.entries()) {
            const where = `${mode} ${lang} ${id}`;
            expect(
              await inPage(
                page,
                "() => [...document.querySelectorAll('.stepper a')].map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])",
              ),
              where,
            ).toEqual(
              // (The step you are on links to the top of its own page.)
              SELF_HOST_PATH.map((step, k) => [
                `${k + 1}${names[k]}`,
                k === i ? "#top" : pathOf(mode, lang, step),
                k === i ? "step" : null,
              ]),
            );
            expect(await textOf(page, "a.pg-prev .pg-t"), where).toBe(names[i - 1] ?? null);
            expect(await textOf(page, "a.pg-next .pg-t"), where).toBe(names[i + 1] ?? null);
            const next = SELF_HOST_PATH[i + 1];
            if (next !== undefined) {
              await Promise.all([
                page.waitForURL(`${origin}${pathOf(mode, lang, next)}`),
                page.locator("a.pg-next").click(),
              ]);
            }
          }
          await Promise.all([
            page.waitForURL(`${origin}${pathOf(mode, lang, "docker")}`),
            page.locator("a.pg-prev").click(),
          ]);
          await Promise.all([
            page.waitForURL(`${origin}${pathOf(mode, lang, "install")}`),
            page.locator(".stepper a").nth(1).click(),
          ]);
          expect(await textOf(page, '.stepper a[aria-current="step"]')).toBe(`2${names[1]}`);
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });

    test("on a phone, the stepper shows the step you are on", async ({ expect }) => {
      const origin = site().servers.hosted.url;
      for (const lang of ["en", "ar"] as const) {
        const tab = await openSitePage(site().browser, { mobile: true });
        const { page } = tab;
        try {
          for (const id of SELF_HOST_PATH) {
            await tab.goto(`${origin}${pathOf("hosted", lang, id)}`);
            const row = await boxOf(page, ".stepper ol");
            const step = await boxOf(page, '.stepper a[aria-current="step"]');
            const where = `${lang} ${id}: ${JSON.stringify({ row, step })}`;
            expect(step?.left ?? -1, where).toBeGreaterThanOrEqual((row?.left ?? 0) - 1);
            expect(step?.right ?? 9999, where).toBeLessThanOrEqual((row?.right ?? 0) + 1);
          }
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });

    test("the questions on How it works open and close", async ({ expect }) => {
      const origin = site().servers.hosted.url;
      for (const lang of ["en", "ar"] as const) {
        const tab = await openSitePage(site().browser, { mobile: lang === "ar" });
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf("hosted", lang, "how-it-works")}`);
          const count = await countOf(page, ".faq details");
          expect(count).toBeGreaterThan(3);
          for (let i = 0; i < count; i++) {
            const item = page.locator(".faq details").nth(i);
            const answer = `.faq details:nth-of-type(${i + 1}) p`;
            expect(await item.getAttribute("open"), `${lang} #${i}`).toBeNull();
            expect(await isShown(page, answer), `${lang} #${i}`).toBe(false);
            await item.locator("summary").click();
            expect(await item.getAttribute("open"), `${lang} #${i}`).toBe("");
            expect(await isShown(page, answer), `${lang} #${i}`).toBe(true);
            await item.locator("summary").click();
            expect(await item.getAttribute("open"), `${lang} #${i}`).toBeNull();
          }
          expect(tab.problems()).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });
  });
}
