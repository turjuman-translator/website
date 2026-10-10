// @vitest-environment happy-dom
// The text pages' script (site/client/page.ts) and its helpers (site/client/doc.ts): "On this page"
// marks the section being read, the self-host stepper scrolls its current step into view on a
// phone, the language goes to the app, and the dot field keeps still for reading.
import { afterEach, describe, expect, it } from "vitest";
import { MOTION_KEY, SITE_LANG_KEY } from "../../site/client/storage-keys.js";
import {
  cleanup,
  type Env,
  FakeIntersectionObserver,
  install,
  intersect,
  place,
  showPage,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(page = "install", lang: "en" | "nl" | "ar" = "en") {
  env = install();
  showPage(page, lang);
  return import("../../site/client/doc.js");
}

afterEach(cleanup);

const section = (id: string): HTMLElement => {
  const s = document.getElementById(id);
  if (s === null) throw new Error(`no section ${id}`);
  return s;
};
const current = (): string[] =>
  [...document.querySelectorAll('.toc a[aria-current="true"]')].map(
    (a) => a.getAttribute("href") ?? "",
  );

describe("site: On this page", () => {
  it("marks the first section on screen, in the reading order", async () => {
    const { tocSpy } = await load();
    tocSpy();
    const [io] = FakeIntersectionObserver.all;
    expect(io?.rootMargin).toBe("-15% 0px -55% 0px");
    expect([...(io?.targets ?? [])].map((s) => s.id)).toEqual([
      ...[...document.querySelectorAll(".toc a")].map((a) => a.getAttribute("href")?.slice(1)),
    ]);
    expect(current()).toEqual([]);
    intersect([section("start"), section("keys")], true);
    expect(current()).toEqual(["#keys"]);
    intersect(section("keys"), false);
    expect(current()).toEqual(["#start"]);
    intersect(section("start"), false);
    expect(current()).toEqual([]);
  });

  it("skips a listed section that is not on the page", async () => {
    const { tocSpy } = await load("install", "ar");
    section("keys").remove();
    tocSpy();
    const [io] = FakeIntersectionObserver.all;
    expect([...(io?.targets ?? [])].map((s) => s.id)).not.toContain("keys");
    intersect(section("need"), true);
    expect(current()).toEqual(["#need"]);
  });

  it("does nothing on a page without the list, or without IntersectionObserver", async () => {
    const { tocSpy } = await load("home");
    tocSpy();
    expect(FakeIntersectionObserver.all).toEqual([]);
    cleanup();
    const again = await load("install");
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
    again.tocSpy();
    expect(FakeIntersectionObserver.all).toEqual([]);
    expect(current()).toEqual([]);
  });
});

describe("site: the self-host stepper on a phone", () => {
  const row = (): HTMLElement => {
    const ol = document.querySelector<HTMLElement>(".stepper ol");
    if (ol === null) throw new Error("no stepper");
    return ol;
  };
  const overflow = (el: HTMLElement, scrollWidth: number, clientWidth: number): void => {
    Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
    Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  };

  it("scrolls the row (never the page) so the current step sits in the middle", async () => {
    const { stepperIntoView } = await load("network");
    const step = document.querySelector('.stepper a[aria-current="step"]');
    expect(step?.getAttribute("href")).toBe("#top");
    overflow(row(), 900, 390);
    place(row(), { left: 0, top: 70, width: 390, height: 44 });
    if (step === null) throw new Error("no current step");
    place(step, { left: 500, top: 70, width: 120, height: 44 });
    stepperIntoView();
    // the step's centre (560) to the row's centre (195)
    expect(row().scrollLeft).toBe(365);
  });

  it("leaves a row that fits alone, and pages off the path", async () => {
    const { stepperIntoView } = await load("install");
    overflow(row(), 390, 390);
    stepperIntoView();
    expect(row().scrollLeft).toBe(0);
    cleanup();
    const other = await load("security");
    expect(document.querySelector(".stepper")).toBeNull();
    expect(() => other.stepperIntoView()).not.toThrow();
  });
});

describe("site: a text page's script", () => {
  async function start(lang: "en" | "nl" | "ar", motion?: string) {
    env = install();
    showPage("install", lang);
    if (motion !== undefined) localStorage.setItem(MOTION_KEY, motion);
    await import("../../site/client/page.js");
  }

  it("hands its language to the app and draws the dots behind the page, still", async () => {
    await start("ar");
    expect(localStorage.getItem(SITE_LANG_KEY)).toBe("ar");
    const canvas = document.body.firstElementChild;
    expect([canvas?.tagName, canvas?.className, canvas?.getAttribute("aria-hidden")]).toEqual([
      "CANVAS",
      "dotbg",
      "true",
    ]);
    env.frames.tick();
    expect(env.contexts[0]?.dots.length).toBeGreaterThan(0);
    // A page made for reading keeps still: no frame after the first picture.
    expect(env.frames.pending).toBe(0);
    expect(FakeIntersectionObserver.all).toHaveLength(1);
    expect(document.documentElement.classList.contains("motion-paused")).toBe(false);
  });

  it("stays paused when the visitor paused the animations on the home page", async () => {
    await start("nl", "paused");
    expect(document.documentElement.classList.contains("motion-paused")).toBe(true);
    cleanup();
    await start("en", "playing");
    expect(document.documentElement.classList.contains("motion-paused")).toBe(false);
  });
});
