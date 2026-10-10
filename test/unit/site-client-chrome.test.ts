// @vitest-environment happy-dom
// The page chrome of every website page (site/client/chrome.ts): the language hand-off to the app,
// the Copy buttons of command blocks (the clipboard, or a selection where there is none), the phone
// menu, and pausing everything that moves, remembered on this device: the home page's button (the
// board's play button) works from the moment the page loads, until the board takes it over
// (site-client-board.test.ts).
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION_KEY, SITE_LANG_KEY } from "../../site/client/storage-keys.js";
import type { SiteLang } from "../../site/content/khutbah.js";
import { SELF_HOST_COMMANDS } from "../../site/content/links.js";
import { DICTS } from "../../site/content/strings.js";
import { cleanup, install, showPage } from "./helpers/site-client-env.js";

async function load(page = "home", lang: SiteLang = "en") {
  install();
  showPage(page, lang);
  return import("../../site/client/chrome.js");
}

const $ = <T extends Element = HTMLElement>(selector: string): T => {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`no ${selector}`);
  return node;
};

/** A clipboard that resolves or refuses (navigator.clipboard is put back after the test). */
function clipboard(ok: boolean | undefined) {
  const writeText = vi.fn((_text: string) =>
    ok ? Promise.resolve() : Promise.reject(new DOMException("denied", "NotAllowedError")),
  );
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: ok === undefined ? undefined : { writeText },
  });
  return writeText;
}

/** The clipboard's promise and what follows it (no timers: those are the tests'). */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  cleanup();
});

describe("site: the language hand-off", () => {
  it("opens the app in the language of the page the visitor reads", async () => {
    for (const lang of ["en", "nl", "ar"] as const) {
      const { rememberLanguage } = await load("install", lang);
      rememberLanguage();
      expect(localStorage.getItem(SITE_LANG_KEY)).toBe(lang);
      cleanup();
    }
  });
});

describe("site: Copy buttons", () => {
  it("copies the self-host commands, says Copied (also to a screen reader), then goes back", async () => {
    const { copyButtons } = await load();
    const writeText = clipboard(true);
    copyButtons();
    const btn = $("[data-copy=commands]");
    const status = $("#self-host [role=status]");
    btn.click();
    await settle();
    expect(btn.textContent).toBe(DICTS.en.copied);
    expect(writeText).toHaveBeenCalledWith($("#commands").innerText);
    for (const command of SELF_HOST_COMMANDS)
      expect(writeText.mock.calls[0]?.[0]).toContain(command);
    expect(status.textContent).toBe(DICTS.en.copied);
    vi.advanceTimersByTime(1599);
    expect(btn.textContent).toBe(DICTS.en.copied);
    vi.advanceTimersByTime(1);
    expect([btn.textContent, status.textContent]).toEqual([DICTS.en.copy, ""]);
  });

  it("keeps Copied for 1.6 s after the last click", async () => {
    const { copyButtons } = await load();
    clipboard(true);
    copyButtons();
    const btn = $("[data-copy=commands]");
    btn.click();
    await settle();
    expect(btn.textContent).toBe(DICTS.en.copied);
    vi.advanceTimersByTime(1000);
    btn.click();
    await settle();
    vi.advanceTimersByTime(1000);
    expect(btn.textContent).toBe(DICTS.en.copied);
    vi.advanceTimersByTime(600);
    expect(btn.textContent).toBe(DICTS.en.copy);
  });

  it("copies a command block of a text page, in the page's language", async () => {
    const { copyButtons } = await load("install", "ar");
    const writeText = clipboard(true);
    copyButtons();
    const btn = $<HTMLButtonElement>(".codebox button[data-copy]");
    const source = $(`#${btn.dataset.copy}`);
    btn.click();
    await settle();
    expect(btn.textContent).toBe(DICTS.ar.copied);
    expect(writeText).toHaveBeenCalledWith(source.innerText);
    expect(btn.parentElement?.querySelector("[role=status]")?.textContent).toBe(DICTS.ar.copied);
  });

  it("selects the commands when the clipboard refuses, so they can be copied by hand", async () => {
    const { copyButtons } = await load();
    clipboard(false);
    copyButtons();
    const btn = $("[data-copy=commands]");
    btn.click();
    await settle();
    expect(window.getSelection()?.rangeCount).toBe(1);
    expect(window.getSelection()?.getRangeAt(0).startContainer).toBe($("#commands"));
    expect(btn.textContent).toBe(DICTS.en.copy);
  });

  it("selects the commands where there is no clipboard (plain http on the LAN)", async () => {
    const { copyButtons } = await load();
    clipboard(undefined);
    copyButtons();
    window.getSelection()?.removeAllRanges();
    $("[data-copy=commands]").click();
    expect(window.getSelection()?.getRangeAt(0).startContainer).toBe($("#commands"));
    expect($("[data-copy=commands]").textContent).toBe(DICTS.en.copy);
  });

  it("leaves a button without its block alone, and keeps a label without a Copied word", async () => {
    const { copyButtons } = await load();
    const writeText = clipboard(true);
    document.body.innerHTML =
      '<pre id="cmd">make</pre><div><button type="button" data-copy="cmd">Copy</button></div>' +
      '<button type="button" id="stray" data-copy="gone">Copy</button>';
    copyButtons();
    $("#stray").click();
    expect(writeText).not.toHaveBeenCalled();
    const btn = $("[data-copy=cmd]");
    btn.click();
    await settle();
    expect(writeText).toHaveBeenCalledWith("make");
    expect(btn.textContent).toBe("Copy");
    vi.advanceTimersByTime(1600);
    expect(btn.textContent).toBe("Copy");
  });
});

describe("site: the phone menu", () => {
  it("does nothing on a page without one", async () => {
    const { phoneMenu } = await load();
    document.body.innerHTML = "<p>No menu</p>";
    expect(() => phoneMenu()).not.toThrow();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });

  it("closes with Escape and gives the focus back to its button", async () => {
    const { phoneMenu } = await load("install", "nl");
    phoneMenu();
    const menu = $<HTMLDetailsElement>("details.menu");
    const summary = $("details.menu summary");
    menu.open = true;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(menu.open).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    // Escape on a closed menu leaves the focus where it is.
    $<HTMLAnchorElement>(".skip").focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.activeElement).toBe($(".skip"));
  });

  it("closes on a click elsewhere, not on a click inside it", async () => {
    const { phoneMenu } = await load();
    phoneMenu();
    const menu = $<HTMLDetailsElement>("details.menu");
    menu.open = true;
    $(".menu-panel").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(menu.open).toBe(true);
    $("main").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(menu.open).toBe(false);
    // A click while it is closed changes nothing.
    $("main").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(menu.open).toBe(false);
  });
});

describe("site: pausing everything that moves", () => {
  const motion = () => ({
    paused: document.documentElement.classList.contains("motion-paused"),
    stored: localStorage.getItem(MOTION_KEY),
  });

  it("pauses and plays everything, and remembers the choice", async () => {
    const { pauseMotion } = await load("home", "nl");
    const { isPaused } = await import("../../site/client/motion.js");
    expect(motion()).toEqual({ paused: false, stored: null });
    pauseMotion(true);
    expect([motion(), isPaused()]).toEqual([{ paused: true, stored: "paused" }, true]);
    pauseMotion(false);
    expect([motion(), isPaused()]).toEqual([{ paused: false, stored: "playing" }, false]);
  });

  it("starts paused on a device where the visitor paused them before", async () => {
    const { restoreMotion } = await load("home", "ar");
    localStorage.setItem(MOTION_KEY, "paused");
    restoreMotion();
    expect(motion()).toEqual({ paused: true, stored: "paused" });
  });

  /** The home page's button: enabled or not, its label, and its icon (Play while paused). */
  const button = () => {
    const btn = $<HTMLButtonElement>(".yt-play");
    return {
      disabled: btn.disabled,
      label: btn.getAttribute("aria-label"),
      play: btn.classList.contains("paused"),
    };
  };

  it("works the button from the moment the page loads: it pauses and plays, and remembers", async () => {
    const { motionButton } = await load("home", "nl");
    // without the script it does nothing, so the page has it disabled
    expect(button().disabled).toBe(true);
    motionButton($(".yt-play"));
    expect(button()).toEqual({ disabled: false, label: DICTS.nl.motionPause, play: false });
    $(".yt-play").click();
    expect(button()).toEqual({ disabled: false, label: DICTS.nl.motionPlay, play: true });
    expect(motion()).toEqual({ paused: true, stored: "paused" });
    $(".yt-play").click();
    expect(button()).toEqual({ disabled: false, label: DICTS.nl.motionPause, play: false });
    expect(motion()).toEqual({ paused: false, stored: "playing" });
  });

  it("shows Play at once where the visitor paused before, and follows the page", async () => {
    const { motionButton, pauseMotion, restoreMotion } = await load("home", "ar");
    localStorage.setItem(MOTION_KEY, "paused");
    restoreMotion();
    motionButton($(".yt-play"));
    expect(button()).toEqual({ disabled: false, label: DICTS.ar.motionPlay, play: true });
    pauseMotion(false);
    expect(button()).toMatchObject({ label: DICTS.ar.motionPause, play: false });
  });

  it("leaves the button alone once the board has taken it over", async () => {
    const { motionButton, pauseMotion } = await load();
    const takeButton = motionButton($(".yt-play"));
    takeButton();
    $(".yt-play").click();
    expect(motion()).toEqual({ paused: false, stored: null });
    pauseMotion(true);
    expect(button()).toEqual({ disabled: false, label: DICTS.en.motionPause, play: false });
  });

  it("moves on a device where the visitor played them again, or never chose", async () => {
    for (const stored of ["playing", null]) {
      const { restoreMotion } = await load();
      if (stored !== null) localStorage.setItem(MOTION_KEY, stored);
      restoreMotion();
      expect(motion()).toEqual({ paused: false, stored });
      cleanup();
    }
  });
});
