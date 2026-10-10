// Page chrome: the language hand-off to the app, the copy buttons of command blocks, the phone menu
// (a <details> that works without script; the script closes it on Escape or a click elsewhere),
// and pausing everything that moves, remembered on this device (the switch is the board's play
// button, site/client/board.ts).
import { data, findAll, pageLang, storageGet, storageSet } from "./dom.js";
import { isPaused, onPausedChange, setPaused } from "./motion.js";
import { MOTION_KEY, SITE_LANG_KEY } from "./storage-keys.js";

/** The app (/signup, /login, /app) opens in the language of the page the visitor reads. */
export function rememberLanguage(): void {
  storageSet(SITE_LANG_KEY, pageLang());
}

export function phoneMenu(): void {
  const menu = document.querySelector("details.menu");
  if (!(menu instanceof HTMLDetailsElement)) return;
  const summary = menu.querySelector("summary");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menu.open) return;
    menu.open = false;
    summary?.focus();
  });
  document.addEventListener("click", (e) => {
    if (menu.open && e.target instanceof Node && !menu.contains(e.target)) menu.open = false;
  });
}

export function copyButtons(): void {
  for (const btn of findAll("[data-copy]", HTMLButtonElement)) {
    const source = document.getElementById(data(btn, "copy"));
    if (source === null) continue;
    const label = btn.textContent ?? "";
    // A screen reader hears "Copied" through the status next to the button.
    const status = btn.parentElement?.querySelector("[role=status]") ?? null;
    let timer: number | undefined;
    const select = (): void => {
      const range = document.createRange();
      range.selectNodeContents(source);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    btn.addEventListener("click", () => {
      const done = (): void => {
        btn.textContent = data(btn, "copied") || label;
        if (status !== null) status.textContent = btn.textContent;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          btn.textContent = label;
          if (status !== null) status.textContent = "";
        }, 1600);
      };
      // The clipboard needs a secure context (not plain http on the LAN): then select the text.
      if (navigator.clipboard === undefined) {
        select();
        return;
      }
      // innerText: one command per line (the "$ " prompts are drawn by CSS, not copied).
      navigator.clipboard.writeText(source.innerText).then(done, select);
    });
  }
}

/** Pauses or plays everything that moves on the page (WCAG 2.2.2), and remembers it. */
export function pauseMotion(paused: boolean): void {
  storageSet(MOTION_KEY, paused ? "paused" : "playing");
  setPaused(paused);
}

/** A visitor who paused the animations finds them paused again. */
export function restoreMotion(): void {
  if (storageGet(MOTION_KEY) === "paused") setPaused(true);
}

/** The home page's "Pause animations" button (the board's play button) works from the moment the
 *  page loads, before the board has started: a press pauses or plays everything that moves, and
 *  its label and icon follow the page. Once the board starts it takes the button over (call the
 *  function this returns). */
export function motionButton(btn: HTMLButtonElement): () => void {
  let taken = false;
  const sync = (paused: boolean): void => {
    if (taken) return;
    btn.classList.toggle("paused", paused);
    btn.setAttribute("aria-label", data(btn, paused ? "play" : "pause"));
  };
  sync(isPaused());
  onPausedChange(sync);
  btn.addEventListener("click", () => {
    if (!taken) pauseMotion(!isPaused());
  });
  // Disabled in the page itself: without the script the button does nothing.
  btn.disabled = false;
  return () => {
    taken = true;
  };
}
