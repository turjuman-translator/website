// Website bugs these suites found, written as the behaviour it should have (each was a test.fails
// until its fix; both are fixed now and guard against a return).
import { describe, test } from "vitest";
import { DICTS } from "../../../site/content/strings.js";
import { inPage, openSitePage, type Site } from "../helpers/website.js";

export function knownBugsSuite(site: () => Site): void {
  describe.concurrent("website bugs found earlier (fixed)", () => {
    // site/client/board.ts: the chapters start at [0, athan.e, iqama.s, iqama.e]; the Athan's and
    // the Salah's cues begin 140 ms later (site/client/timeline.ts, GAP). Stepping through the
    // chapters while the board stands still (reduced motion, or paused) shows an empty board for
    // the Athan (Home) and the Salah (PageUp from the Iqama); only the Iqama's start shows its card.
    test("a chapter's start shows its prayer moment on the board", async ({ expect }) => {
      const tab = await openSitePage(site().browser, { reducedMotion: true });
      const { page } = tab;
      const at = (): Promise<{ chapter: string; card: string }> =>
        inPage(
          page,
          `() => ({
            chapter: document.querySelector(".yt-chap").textContent,
            card: document.getElementById("board").dataset.card ?? "",
          })`,
        );
      try {
        await tab.goto(`${site().servers.hosted.url}/`);
        await page.locator(".yt-track").focus();
        await page.keyboard.press("Home");
        const athan = await at();
        await page.keyboard.press("PageUp");
        await page.keyboard.press("PageUp");
        const iqama = await at();
        await page.keyboard.press("PageUp");
        const salah = await at();
        expect([athan, iqama, salah]).toEqual([
          { chapter: DICTS.en.m_athan, card: "athan" },
          { chapter: DICTS.en.m_iqama, card: "iqama" },
          { chapter: DICTS.en.m_salah, card: "salah" },
        ]);
      } finally {
        await tab.close();
      }
    });

    // src/server/site.ts, isWebsite(): every address under /site-assets/ counts as the public
    // website, also one that answers 404, so that 404 has no X-Robots-Tag, unlike every other
    // error (docs/seo.md: "noindex … on every response that is not the public website: … every
    // error, the 404 page").
    test("a missing website file's 404 says noindex, like every other error", async ({
      expect,
    }) => {
      const res = await fetch(`${site().servers.hosted.url}/site-assets/no-such-file.css`);
      expect([res.status, res.headers.get("x-robots-tag")]).toEqual([404, "noindex, nofollow"]);
    });
  });
}
