// The script of the website's other pages (not the home page): the language hand-off to the app,
// the copy buttons of command blocks, the phone menu, "On this page" and the stepper, and the dot
// field, kept still on pages made for reading (a click still rings, unless animations were paused on the home page or motion is
// reduced).
import { copyButtons, phoneMenu, rememberLanguage } from "./chrome.js";
import { stepperIntoView, tocSpy } from "./doc.js";
import { storageGet } from "./dom.js";
import { DotField } from "./dots.js";
import { setPaused } from "./motion.js";
import { MOTION_KEY } from "./storage-keys.js";

rememberLanguage();
copyButtons();
phoneMenu();
tocSpy();
stepperIntoView();
if (storageGet(MOTION_KEY) === "paused") setPaused(true);
new DotField({ drift: false });
