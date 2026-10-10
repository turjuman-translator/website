// @vitest-environment happy-dom
// The website script's small DOM helpers (site/client/dom.ts): elements, lookups that fail loudly
// when the page and the script are out of sync, the brand colours for the canvas, the page's
// language, and storage that may be unavailable.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  data,
  el,
  find,
  findAll,
  pageLang,
  storageGet,
  storageSet,
  tokenRgb,
} from "../../site/client/dom.js";

beforeEach(() => {
  document.body.innerHTML =
    '<div id="box" data-copy="commands"><button type="button" class="b">One</button>' +
    '<span class="b">Two</span><button type="button" class="b">Three</button></div>';
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("style");
  localStorage.clear();
});

describe("site: DOM helpers", () => {
  it("makes an element with a class and a text, or neither", () => {
    const p = el("p", "lead", "Hello");
    expect([p.tagName, p.className, p.textContent]).toEqual(["P", "lead", "Hello"]);
    const bare = el("span");
    expect([bare.hasAttribute("class"), bare.textContent]).toEqual([false, ""]);
  });

  it("finds an element of the right kind, inside a root or in the document", () => {
    const box = find("#box", HTMLDivElement);
    expect(find(".b", HTMLButtonElement, box).textContent).toBe("One");
    expect(findAll(".b", HTMLButtonElement).map((b) => b.textContent)).toEqual(["One", "Three"]);
    expect(findAll(".b", HTMLElement, box)).toHaveLength(3);
  });

  it("fails loudly when the page is out of sync with the script", () => {
    expect(() => find("#nope", HTMLElement)).toThrow("#nope missing or not a HTMLElement");
    expect(() => find("span.b", HTMLButtonElement)).toThrow(
      "span.b missing or not a HTMLButtonElement",
    );
  });

  it("reads a brand colour token as r, g, b for the canvas, black when it is not a hex colour", () => {
    const root = document.documentElement;
    root.style.setProperty("--tj-g800", "#0C3F31");
    root.style.setProperty("--tj-odd", "rgb(1, 2, 3)");
    expect(tokenRgb("--tj-g800")).toBe("12, 63, 49");
    expect(tokenRgb("--tj-odd")).toBe("0, 0, 0");
    expect(tokenRgb("--tj-missing")).toBe("0, 0, 0");
  });

  it("knows the page's language: Dutch, Arabic, else English", () => {
    const root = document.documentElement;
    root.lang = "nl";
    expect(pageLang()).toBe("nl");
    root.lang = "ar";
    expect(pageLang()).toBe("ar");
    root.lang = "de";
    expect(pageLang()).toBe("en");
  });

  it("reads the words a page renders into data attributes, or nothing", () => {
    const box = find("#box", HTMLElement);
    expect(data(box, "copy")).toBe("commands");
    expect(data(box, "copied")).toBe("");
  });

  it("remembers choices in localStorage", () => {
    storageSet("tj-test", "on");
    expect(localStorage.getItem("tj-test")).toBe("on");
    expect(storageGet("tj-test")).toBe("on");
    expect(storageGet("tj-other")).toBeNull();
  });

  it("forgets quietly when the browser refuses storage", () => {
    const refuse = (): never => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: refuse, setItem: refuse });
    expect(() => storageSet("tj-test", "on")).not.toThrow();
    expect(storageGet("tj-test")).toBeNull();
  });
});
