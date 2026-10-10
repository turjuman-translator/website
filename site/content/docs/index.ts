// The text pages by page id (site/content/pages.ts), and the 404 page.
import { type DocPage, L } from "../doc.js";
import { commands } from "./commands.js";
import { docker } from "./docker.js";
import { howItWorks } from "./how-it-works.js";
import { install } from "./install.js";
import { network } from "./network.js";
import { security } from "./security.js";
import { selfHost } from "./self-host.js";
import { showOnAScreen } from "./show-on-a-screen.js";

/** The 404 page: the header, one line and three ways on. */
export const notFound: DocPage = {
  title: L(
    "Page not found · Turjuman",
    "Pagina niet gevonden · Turjuman",
    "الصفحة غير موجودة · ترجمان",
  ),
  desc: L("This page does not exist.", "Deze pagina bestaat niet.", "هذه الصفحة غير موجودة."),
  h1: L("This page does not exist.", "Deze pagina bestaat niet.", "هذه الصفحة غير موجودة."),
  actions: [
    { to: "page:home", label: L("Home", "Home", "الصفحة الرئيسية"), primary: true },
    { to: "page:how-it-works", label: L("How it works", "Hoe het werkt", "كيف يعمل") },
    { to: "page:self-host", label: L("Self-host", "Zelf hosten", "استضافة ذاتية") },
  ],
  sections: [],
};

export const DOC_PAGES: Readonly<Record<string, DocPage>> = {
  "how-it-works": howItWorks,
  "show-on-a-screen": showOnAScreen,
  security,
  "self-host": selfHost,
  install,
  network,
  docker,
  commands,
  "not-found": notFound,
};
