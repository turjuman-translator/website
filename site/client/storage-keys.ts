// What the website keeps in localStorage. Pure, so the tests can check the hand-off to the app.

/** The language of the page the visitor reads (en|nl|ar), written on every page load: the app
 *  opens in it unless the visitor chose another one there (web/shared/app-i18n.ts, SITE_LANG_KEY). */
export const SITE_LANG_KEY = "tj-lang";

/** "paused" after the visitor pressed "Pause animations" ("playing" after "Play animations"). */
export const MOTION_KEY = "tj-site-motion";
