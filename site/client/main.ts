// The home page's script (one bundle for its English, Dutch and Arabic versions; the page's
// <html lang> says which): the live headline, the board, the demos and the dot field. Everything
// that moves waits for the fonts, so measurements are right. The other pages run page.ts.
import { captionLang } from "../content/khutbah.js";
import { captionBoard } from "./board.js";
import { captionStyleDemo } from "./capdemo.js";
import { copyButtons, motionButton, phoneMenu, rememberLanguage, restoreMotion } from "./chrome.js";
import { prayerDemo, verseDemo } from "./demos.js";
import { find, pageLang } from "./dom.js";
import { DotField } from "./dots.js";
import { liveHeadline } from "./headline.js";

// First, before any link can be followed: the app opens in this page's language.
rememberLanguage();

function start(): void {
  const cap = captionLang(pageLang());
  const field = new DotField();
  liveHeadline(find(".a1-stage", HTMLElement), cap);
  captionBoard({
    board: find("#board", HTMLElement),
    scrubber: find("#scrubber", HTMLElement),
    lang: cap,
    lattice: () => field.lattice(),
    takeButton,
  });
  captionStyleDemo(find("#custom", HTMLElement));
  verseDemo(find("#verse-demo", HTMLElement));
  prayerDemo(find("#prayer-demo", HTMLElement));
}

copyButtons();
phoneMenu();
// Before anything moves: a visitor who paused the animations finds them paused, and the
// "Pause animations" button works before the board has started.
restoreMotion();
const takeButton = motionButton(find("#scrubber .yt-play", HTMLButtonElement));

let started = false;
const go = (): void => {
  if (started) return;
  started = true;
  start();
};
void document.fonts.ready.then(go);
window.setTimeout(go, 1500);
