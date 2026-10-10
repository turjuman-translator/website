// The public website end to end, in the system Chrome against real servers: a hosted one (the
// website at /, /nl and /ar), a local one (the preview under /site, next to the builder) and a
// hosted one with its public URL and footer links set. One browser for the whole suite; every
// test opens its own contexts. The suites are in the files next to this one.
import type { Browser } from "playwright-core";
import { afterAll, beforeAll } from "vitest";
import { launchChrome } from "../helpers/browser.js";
import { type Site, type SiteServers, startSiteServers } from "../helpers/website.js";
import { homeSuite } from "./home.js";
import { knownBugsSuite } from "./known-bugs.js";
import { navigationSuite } from "./navigation.js";
import { pagesSuite } from "./pages.js";
import { seoSuite } from "./seo.js";
import { textPagesSuite } from "./text-pages.js";

let browser: Browser | undefined;
let servers: SiteServers | undefined;
let stopServers: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const [chrome, started] = await Promise.all([launchChrome(), startSiteServers()]);
  browser = chrome;
  servers = started.servers;
  stopServers = started.stop;
});

afterAll(async () => {
  await browser?.close();
  await stopServers?.();
});

function site(): Site {
  if (browser === undefined || servers === undefined) throw new Error("the site is not up");
  const s = servers;
  return {
    browser,
    servers: s,
    server: (mode) => (mode === "hosted" ? s.hosted : s.local),
  };
}

// All concurrent (at most five tests at a time): the long demo tests wait on page time, not
// on the processor.
homeSuite(site);
pagesSuite(site);
navigationSuite(site);
textPagesSuite(site);
seoSuite(site);
knownBugsSuite(site);
