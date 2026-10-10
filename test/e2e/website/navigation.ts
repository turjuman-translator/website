// The header and the ways into the app: the nav and the wordmark, the language switch, the phone
// menu, the skip link, and "Start for free" / "Log in" (the public website signs a mosque up; the
// local preview opens the builder), each in the language the visitor was reading.
import type { Locator, Page } from "playwright-core";
import { describe, test } from "vitest";
import { GITHUB_URL } from "../../../site/content/links.js";
import { DICTS } from "../../../site/content/strings.js";
import { message } from "../../../web/shared/app-i18n.js";
import { randomToken } from "../helpers/instance.js";
import {
  inPage,
  openSitePage,
  pathOf,
  SITE_LANGS,
  type Site,
  type SiteLang,
  waitFor,
} from "../helpers/website.js";
import { attrOf, boxOf, focused, isShown, textOf, waitForText } from "../helpers/website-dom.js";

/** Follows a link (or a button that navigates) and waits for the new page and its fonts. */
async function follow(page: Page, link: Locator, url: string): Promise<void> {
  await Promise.all([page.waitForURL(url), link.click()]);
  await page.evaluate("document.fonts.ready.then(() => true)");
}

/** The same, with a tap (a phone). */
async function tap(page: Page, link: Locator, url: string): Promise<void> {
  await Promise.all([page.waitForURL(url), link.tap()]);
  await page.evaluate("document.fonts.ready.then(() => true)");
}

/** Is an element that is shown under the point at the centre of `selector`'s box inside it (is
 *  it on top)? */
function onTop(page: Page, selector: string): Promise<boolean[]> {
  return inPage<boolean[]>(
    page,
    `(s) => [...document.querySelectorAll(s)].map((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    })`,
    selector,
  );
}

export function navigationSuite(site: () => Site): void {
  describe.concurrent("the header, the language switch and the ways into the app", () => {
    test("the nav leads to each section, marks where you are, and the wordmark leads home", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      const tab = await openSitePage(site().browser);
      const { page } = tab;
      try {
        for (const lang of SITE_LANGS) {
          const d = DICTS[lang];
          const at = (id: string): string => `${origin}${pathOf("hosted", lang, id)}`;
          const nav = page.locator("nav.links");
          await tab.goto(at("home"));
          expect(await isShown(page, "nav.links"), lang).toBe(true);
          expect(await isShown(page, "details.menu"), "no phone menu on a wide screen").toBe(false);
          const github = nav.getByRole("link", { name: "GitHub", exact: true });
          expect([
            await github.getAttribute("href"),
            await github.getAttribute("hreflang"),
          ]).toEqual([GITHUB_URL, "en"]);

          await follow(
            page,
            nav.getByRole("link", { name: d.nav1, exact: true }),
            at("how-it-works"),
          );
          expect(await attrOf(page, 'nav.links a[href="#top"]', "aria-current")).toBe("page");
          expect(await textOf(page, 'nav.links a[aria-current="page"]')).toBe(d.nav1);

          await follow(page, nav.getByRole("link", { name: d.nav2, exact: true }), at("self-host"));
          expect(await textOf(page, 'nav.links a[aria-current="page"]')).toBe(d.nav2);

          // Deeper in the self-host section, "Self-host" marks the section.
          await tab.goto(at("install"));
          expect(await textOf(page, 'nav.links a[aria-current="true"]')).toBe(d.nav2);
          expect(await attrOf(page, 'nav.links a[aria-current="true"]', "href")).toBe(
            pathOf("hosted", lang, "self-host"),
          );

          await follow(page, page.locator("header .wm-link"), at("home"));
          expect(await attrOf(page, "header .wm-link", "aria-label")).toBe(
            lang === "ar" ? "ترجمان" : "Turjuman",
          );
        }
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("the language switch keeps you on the same page, on the website and in the preview", async ({
      expect,
    }) => {
      for (const [mode, mobile] of [
        ["hosted", false],
        ["local", true],
      ] as const) {
        const origin = site().server(mode).url;
        const tab = await openSitePage(site().browser, { mobile });
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf(mode, "en", "install")}`);
          // A phone shows the short names (EN, NL, عربي); a wide screen the full ones.
          // (The full name stays for screen readers, in a 1 px box.)
          expect(await isShown(page, '.langs a[data-lang="ar"] .sh'), mode).toBe(mobile);
          const full = await boxOf(page, '.langs a[data-lang="ar"] .lg');
          expect((full?.width ?? 0) > 1, `${mode}: the full name is shown`).toBe(!mobile);
          for (const lang of ["nl", "ar", "en"] as const satisfies readonly SiteLang[]) {
            const link = page.locator(`.langs a[data-lang="${lang}"]`);
            const to = `${origin}${pathOf(mode, lang, "install")}`;
            if (mobile) await tap(page, link, to);
            else await follow(page, link, to);
            expect(
              await inPage(
                page,
                "() => [document.documentElement.lang, document.documentElement.dir, document.body.dataset.page]",
              ),
            ).toEqual([lang, lang === "ar" ? "rtl" : "ltr", "install"]);
            expect(await attrOf(page, ".langs a[aria-current]", "data-lang")).toBe(lang);
          }
          expect(tab.problems(), mode).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });

    test("the phone menu opens over the page, closes with Escape or a tap elsewhere, and its links work", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      for (const lang of SITE_LANGS) {
        const d = DICTS[lang];
        const tab = await openSitePage(site().browser, { mobile: true });
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf("hosted", lang, "security")}`);
          expect(await isShown(page, "nav.links"), `${lang}: no section links in the bar`).toBe(
            false,
          );
          expect(await isShown(page, ".menu > summary"), `${lang}: the menu button`).toBe(true);
          expect(await isShown(page, ".menu-panel"), `${lang}: closed at first`).toBe(false);

          await page.locator(".menu > summary").tap();
          expect(await attrOf(page, "details.menu", "open"), `${lang}: open`).toBe("");
          const panel = await boxOf(page, ".menu-panel");
          expect(panel, lang).not.toBeNull();
          // Inside the screen, also right to left.
          expect(panel?.left ?? -1, `${lang}: the panel's left edge`).toBeGreaterThanOrEqual(0);
          expect(panel?.right ?? 999, `${lang}: the panel's right edge`).toBeLessThanOrEqual(390);
          expect(
            await inPage(
              page,
              "() => [...document.querySelectorAll('.menu-panel a')].map((a) => [a.textContent.trim(), a.getAttribute('href')])",
            ),
          ).toEqual([
            [d.nav1, pathOf("hosted", lang, "how-it-works")],
            [d.nav2, pathOf("hosted", lang, "self-host")],
            ["GitHub", GITHUB_URL],
            [d.login, "/login"],
            [d.start, "/signup"],
          ]);
          expect(
            await onTop(page, ".menu-panel a"),
            `${lang}: the links lie over the page`,
          ).toEqual([true, true, true, true, true]);

          await page.keyboard.press("Escape");
          expect(
            await attrOf(page, "details.menu", "open"),
            `${lang}: Escape closes it`,
          ).toBeNull();
          expect(await focused(page), `${lang}: the focus goes back to the button`).toBe("summary");

          await page.locator(".menu > summary").tap();
          await page.locator("footer .foot-credit").tap();
          expect(await attrOf(page, "details.menu", "open"), `${lang}: a tap elsewhere`).toBeNull();

          await page.locator(".menu > summary").tap();
          await tap(
            page,
            page.locator(".menu-panel").getByRole("link", { name: d.nav1, exact: true }),
            `${origin}${pathOf("hosted", lang, "how-it-works")}`,
          );
          expect(
            await attrOf(page, "details.menu", "open"),
            `${lang}: closed on the new page`,
          ).toBeNull();
          expect(tab.problems(), lang).toEqual([]);
        } finally {
          await tab.close();
        }
      }
    });

    test("the skip link is the first stop and jumps to the content", async ({ expect }) => {
      const origin = site().servers.hosted.url;
      const tab = await openSitePage(site().browser);
      const { page } = tab;
      try {
        for (const id of ["home", "install"]) {
          await tab.goto(`${origin}${pathOf("hosted", "ar", id)}`);
          await page.keyboard.press("Tab");
          expect(await focused(page), id).toBe("a.skip");
          const box = await boxOf(page, "a.skip");
          expect(box?.top ?? -1, `${id}: shown when focused`).toBeGreaterThanOrEqual(0);
          expect(await textOf(page, "a.skip")).toBe(DICTS.ar.skip);
          await page.keyboard.press("Enter");
          await page.waitForURL(`${origin}${pathOf("hosted", "ar", id)}#main`);
          // The next stop is in the content, past the header's links.
          await page.keyboard.press("Tab");
          expect(
            await inPage(
              page,
              "() => document.getElementById('main').contains(document.activeElement)",
            ),
            `${id}: Tab after the skip link`,
          ).toBe(true);
        }
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("Start for free signs a mosque up, and the app opens in the language it was reading", async ({
      expect,
    }) => {
      const origin = site().servers.hosted.url;
      // The hero's and the last section's "Start for free", the bar's "Start free" and the
      // phone menu's.
      const ways: Array<[SiteLang, string, "cta1" | "start", boolean]> = [
        ["nl", ".a1-ctas a.btn.primary", "cta1", false],
        ["ar", "header a.nav-start", "start", false],
        ["en", "#start .way a.btn.primary", "cta1", false],
        ["nl", ".menu-panel a.btn.primary", "start", true],
      ];
      for (const [lang, selector, label, mobile] of ways) {
        const tab = await openSitePage(site().browser, { mobile });
        const { page } = tab;
        try {
          await tab.goto(`${origin}${pathOf("hosted", lang, "home")}`);
          if (mobile) await page.locator(".menu > summary").tap();
          const link = page.locator(selector);
          expect(await link.textContent(), selector).toBe(DICTS[lang][label]);
          if (mobile) await tap(page, link, `${origin}/signup`);
          else await follow(page, link, `${origin}/signup`);
          await waitForText(page, "h1", message(lang, "signup.title"));
          expect(await inPage(page, "() => document.documentElement.lang"), selector).toBe(lang);
          expect(tab.problems(), `${lang} ${selector}`).toEqual([]);
        } finally {
          await tab.close();
        }
      }

      // "Log in" leads to the log-in page, in the same language.
      const tab = await openSitePage(site().browser);
      try {
        await tab.goto(`${origin}${pathOf("hosted", "ar", "install")}`);
        await follow(tab.page, tab.page.locator("header a.signin"), `${origin}/login`);
        await waitFor(
          tab.page,
          "document.documentElement.lang === 'ar'",
          "the log-in page in Arabic",
        );
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });

    test("in the local preview, Start for free opens the builder, in the language it was reading", async ({
      expect,
    }) => {
      const origin = site().servers.local.url;
      const tab = await openSitePage(site().browser);
      const { page } = tab;
      try {
        // A fresh server: the builder first asks for its admin account (in Dutch, as the page
        // was), then opens.
        await tab.goto(`${origin}${pathOf("local", "nl", "home")}`);
        await page.locator(".a1-ctas a.btn.primary").click();
        await page.waitForURL(/\/login\?next=%2Fapp%2Fnew/);
        await waitForText(page, "h1", message("nl", "setup.title"));
        const password = `e2e-${randomToken()}`;
        await page.locator("#setup-name").fill("E2E");
        await page.locator("#setup-username").fill("e2e-admin");
        await page.locator("#setup-password").fill(password);
        await page.locator("#setup-password2").fill(password);
        await Promise.all([
          page.waitForURL(`${origin}/app/new#step=1`),
          page.locator("#setup-submit").click(),
        ]);
        await waitForText(page, "h1#b-title", message("nl", "b.newScreen"));

        // Signed in, every "Start" opens the builder at once, in the page's language.
        for (const [lang, selector] of [
          ["en", "header a.nav-start"],
          ["ar", "#start .way a.btn.primary"],
          ["nl", "header a.nav-start"],
        ] as const) {
          await tab.goto(`${origin}${pathOf("local", lang, "home")}`);
          await follow(page, page.locator(selector), `${origin}/app/new`);
          await waitForText(page, "h1#b-title", message(lang, "b.newScreen"));
          expect(await inPage(page, "() => document.documentElement.lang"), selector).toBe(lang);
        }
        expect(tab.problems()).toEqual([]);
      } finally {
        await tab.close();
      }
    });
  });
}
