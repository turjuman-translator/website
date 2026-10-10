// The public website for the end-to-end suites: real servers in both modes (hosted: the website at
// /, /nl and /ar; local: the preview under /site), every address the build routes, and pages in
// the system Chrome that record what went wrong. The tests run in Node without the DOM library,
// so the code that runs in the page is written as strings (helpers/website-dom.ts).
import type { Browser, BrowserContext, Page, Response } from "playwright-core";
import { SITE_LANGS, type SiteLang } from "../../../site/content/khutbah.js";
import type { SiteMode } from "../../../site/content/links.js";
import { PAGES, pagePath, type SitePage } from "../../../site/content/pages.js";
import { freePort, type Instance, makeInstance, randomToken } from "./instance.js";
import { type Server, startServer } from "./server.js";

export { SITE_LANGS, type SiteLang, type SiteMode };

/** What the configured hosted server says about itself (hosted.publicUrl and the footer links). */
export const OPERATOR = {
  publicUrl: "https://turjuman.example",
  privacyUrl: "https://turjuman.example/privacy",
  contactUrl: "mailto:hello@turjuman.example",
} as const;

export interface SiteServers {
  /** mode: hosted, no public URL: absolute URLs use the request's own origin. */
  hosted: Server;
  /** mode: local: the builder at /, the website's preview under /site. */
  local: Server;
  /** mode: hosted with hosted.publicUrl, privacyUrl and contactUrl (OPERATOR). */
  configured: Server;
}

export interface Site {
  browser: Browser;
  servers: SiteServers;
  /** The server of `mode` (the plain hosted one for "hosted"). */
  server(mode: SiteMode): Server;
}

async function serve(yaml: (port: number) => string): Promise<{ inst: Instance; srv: Server }> {
  const port = await freePort();
  const inst = makeInstance({ yaml: yaml(port) });
  try {
    return { inst, srv: await startServer(inst, port) };
  } catch (err) {
    inst.remove();
    throw err;
  }
}

const hostedYaml = (port: number, extra = ""): string =>
  `mode: hosted\nserver:\n  port: ${port}\n  token: ${randomToken()}\n` +
  `hosted:\n  signup: open\n${extra}quran:\n  enabled: false\n`;

/** The three servers, started side by side; `stop` ends them and removes their installs. */
export async function startSiteServers(): Promise<{ servers: SiteServers; stop(): Promise<void> }> {
  const started = await Promise.allSettled([
    serve((port) => hostedYaml(port)),
    serve((port) => `server:\n  port: ${port}\nquran:\n  enabled: false\n`),
    serve((port) =>
      hostedYaml(
        port,
        `  publicUrl: ${OPERATOR.publicUrl}\n  privacyUrl: ${OPERATOR.privacyUrl}\n` +
          `  contactUrl: ${OPERATOR.contactUrl}\n`,
      ),
    ),
  ]);
  const ok = started.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const stop = async (): Promise<void> => {
    await Promise.all(ok.map(({ srv }) => srv.stop()));
    for (const { inst } of ok) inst.remove();
  };
  const [hosted, local, configured] = started;
  if (
    hosted?.status !== "fulfilled" ||
    local?.status !== "fulfilled" ||
    configured?.status !== "fulfilled"
  ) {
    await stop();
    const failed = started.find((r) => r.status === "rejected");
    throw failed?.status === "rejected" ? failed.reason : new Error("a server did not start");
  }
  return {
    servers: { hosted: hosted.value.srv, local: local.value.srv, configured: configured.value.srv },
    stop,
  };
}

/** One address of the website: a page in a language and mode, or a missing page (the 404). */
export interface SiteRoute {
  mode: SiteMode;
  lang: SiteLang;
  page: SitePage;
  path: string;
  status: 200 | 404;
}

/** A page address that does not exist, in `lang` (it gets the website's 404 page). */
export const MISSING_SLUG = "no-such-page";

/** Every routed page in every language of `mode`, then the 404 page in each language. */
export function websiteRoutes(mode: SiteMode): SiteRoute[] {
  return SITE_LANGS.flatMap((lang) =>
    PAGES.map((page): SiteRoute => {
      const missing = page.notFound === true;
      return {
        mode,
        lang,
        page,
        path: pagePath(mode, lang, missing ? MISSING_SLUG : page.slug),
        status: missing ? 404 : 200,
      };
    }),
  );
}

/** The address of page `id` in `lang` and `mode`. */
export function pathOf(mode: SiteMode, lang: SiteLang, id: string): string {
  const page = PAGES.find((p) => p.id === id);
  if (page === undefined) throw new Error(`no site page ${id}`);
  return pagePath(mode, lang, page.slug);
}

export interface OpenOptions {
  /** A phone: 390×844, touch, the mobile viewport meta honoured (else 1440×900). */
  mobile?: boolean;
  reducedMotion?: boolean;
  /** Clipboard read and write for this origin, for the copy buttons. */
  clipboard?: string;
  /** Install Playwright's fake clock before the first navigation (timers, rAF, Date). */
  clock?: boolean;
}

export interface SitePageHandle {
  page: Page;
  context: BrowserContext;
  /** Console errors, uncaught errors, CSP violations, failed requests (HTTP 400+ of a
   *  subresource included) and requests to another origin, in order. A page whose own address
   *  answers 404 on purpose (the 404 page) is not a problem. */
  problems(): string[];
  /** The problems since the last call (or since the page opened), for a page that visits
   *  several addresses in turn. */
  takeProblems(): string[];
  /** Navigates to `url` and waits for the fonts (everything that moves waits for them). */
  goto(url: string): Promise<Response>;
  close(): Promise<void>;
}

/** A page in its own context (own storage) that records what went wrong. */
export async function openSitePage(
  browser: Browser,
  opts: OpenOptions = {},
): Promise<SitePageHandle> {
  const mobile = opts.mobile === true;
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    locale: "en-US",
    reducedMotion: opts.reducedMotion === true ? "reduce" : "no-preference",
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}),
  });
  if (opts.clipboard !== undefined) {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: opts.clipboard,
    });
  }
  await context.addInitScript({
    content:
      "document.addEventListener('securitypolicyviolation', (e) => console.error('CSP violation: ' + e.violatedDirective + ' ' + e.blockedURI));",
  });
  const page = await context.newPage();
  if (opts.clock === true) await page.clock.install();
  const log: Array<{ text: string; url: string }> = [];
  /** Documents that answered 404 by design: Chrome logs "Failed to load resource" for them. */
  const missingDocs = new Set<string>();
  page.on("console", (m) => {
    if (m.type() === "error") log.push({ text: `console: ${m.text()}`, url: m.location().url });
  });
  page.on("pageerror", (e) => log.push({ text: `pageerror: ${e.message}`, url: "" }));
  page.on("requestfailed", (r) => {
    // A navigation that a click replaced is aborted on purpose.
    if (r.failure()?.errorText === "net::ERR_ABORTED" && r.isNavigationRequest()) return;
    log.push({ text: `request failed: ${r.url()} (${r.failure()?.errorText})`, url: r.url() });
  });
  let origin = "";
  page.on("request", (r) => {
    const url = r.url();
    if (origin !== "" && !url.startsWith(origin) && !url.startsWith("data:")) {
      log.push({ text: `request elsewhere: ${url}`, url });
    }
  });
  page.on("response", (r) => {
    if (r.status() < 400) return;
    if (r.request().isNavigationRequest() && r.status() === 404) missingDocs.add(r.url());
    else log.push({ text: `HTTP ${r.status()}: ${r.url()}`, url: r.url() });
  });
  const problems = (from: number): string[] =>
    log
      .slice(from)
      .filter(
        (p) =>
          !(
            missingDocs.has(p.url) &&
            p.text.startsWith(
              "console: Failed to load resource: the server responded with a status of 404",
            )
          ),
      )
      .map((p) => p.text);
  let taken = 0;
  return {
    page,
    context,
    problems: () => problems(0),
    takeProblems: () => {
      const out = problems(taken);
      taken = log.length;
      return out;
    },
    goto: async (url) => {
      origin = new URL(url).origin;
      const res = await page.goto(url);
      if (res === null) throw new Error(`no response for ${url}`);
      await page.evaluate("document.fonts.ready.then(() => true)");
      return res;
    },
    close: () => context.close(),
  };
}

/** Runs `fn` (the source of a function, run in the page) with `arg` (JSON) and returns its result. */
export function inPage<T>(page: Page, fn: string, arg?: unknown): Promise<T> {
  const args = arg === undefined ? "" : JSON.stringify(arg);
  return page.evaluate(`(${fn})(${args})`) as Promise<T>;
}

/** Waits (in real time) until `expr`, an expression run in the page, is true. Not
 *  page.waitForFunction: its polling compiles the expression in the page, which the pages' CSP
 *  (no 'unsafe-eval') forbids. */
export async function waitFor(
  page: Page,
  expr: string,
  what: string,
  timeout = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!(await page.evaluate(`Boolean(${expr})`))) {
    if (Date.now() > deadline) throw new Error(`${what}: not within ${timeout} ms (${page.url()})`);
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** Advances the fake clock (OpenOptions.clock) in steps of `step` ms until `expr` (an
 *  expression run in the page) is true, letting `realMs` of real time pass after each step (for
 *  what the fake clock does not drive, such as Web Animations); throws with `what` after `max`
 *  ms of page time. Resolves with the page time it took. */
export async function advanceUntil(
  page: Page,
  expr: string,
  what: string,
  opts: { max?: number; step?: number; realMs?: number } = {},
): Promise<number> {
  const step = opts.step ?? 250;
  const max = opts.max ?? 30_000;
  for (let t = 0; t <= max; t += step) {
    if (await page.evaluate(`Boolean(${expr})`)) return t;
    await page.clock.runFor(step);
    if (opts.realMs !== undefined) await page.waitForTimeout(opts.realMs);
  }
  throw new Error(`${what}: not within ${max} ms of page time`);
}
