// @vitest-environment happy-dom
// "Your screens, your style" (site/client/capdemo.ts): the real caption page's markup in a 16:9
// preview, wearing the app's built-in presets, with the options the caption page really has:
// layout, the Arabic line, the Quran in Arabic, the size and what is behind the screen.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SiteLang } from "../../site/content/khutbah.js";
import { BUILTIN_PRESETS, DEFAULT_PRESET_ID, fontSizeVar } from "../../src/shared/theme.js";
import {
  cleanup,
  type Env,
  install,
  resizeAll,
  setProperty,
  showPage,
} from "./helpers/site-client-env.js";

let env: Env;

async function load(lang: SiteLang = "en", before: () => void = () => {}) {
  env = install();
  showPage("home", lang);
  setProperty($(".capdemo"), "clientWidth", 960);
  before();
  const { captionStyleDemo } = await import("../../site/client/capdemo.js");
  captionStyleDemo($("#custom"));
}

afterEach(cleanup);

function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`no ${selector}`);
  return node;
}
const stage = (): HTMLElement => $(".capdemo-stage");
const pressed = (selector: string): string[] =>
  [...document.querySelectorAll<HTMLElement>(selector)]
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.dataset.preset ?? b.dataset.layout ?? b.dataset.behind ?? "");
const look = () => ({
  preset: pressed(".cd-chip"),
  layout: pressed("[data-layout]"),
  behind: pressed("[data-behind]"),
  blocks: $(".capdemo .blk-root").hidden ? null : $(".capdemo .blk-root").className,
  rollup: $(".capdemo .cap-root").hidden ? null : $(".capdemo .cap-root").className,
  arabic: !$(".capdemo .cap-source").hidden,
  size: $<HTMLInputElement>("#cd-size").value,
  src: $<HTMLInputElement>("#cd-src").checked,
  quran: $<HTMLInputElement>("#cd-quran").checked,
});
const chip = (id: string): HTMLElement => $(`.cd-chip[data-preset="${id}"]`);
const change = (selector: string, event: string, set: (i: HTMLInputElement) => void): void => {
  const input = $<HTMLInputElement>(selector);
  set(input);
  input.dispatchEvent(new Event(event));
};

describe("site: the caption style demo", () => {
  it("starts in the app's default theme, on a camera picture", async () => {
    await load();
    expect(look()).toEqual({
      preset: [DEFAULT_PRESET_ID],
      layout: ["blocks"],
      behind: ["camera"],
      blocks: "blk-root pos-bottom bg-panel show-target quran-ar",
      rollup: null,
      arabic: false,
      size: "52",
      src: false,
      quran: true,
    });
    expect($(".capdemo").dataset.behind).toBe("camera");
    const preset = BUILTIN_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID);
    const vars = Object.entries(preset?.vars ?? {});
    expect(vars.length).toBeGreaterThan(5);
    for (const [name, value] of vars) {
      expect(stage().style.getPropertyValue(name)).toBe(
        value?.replace(/(\d)vw\b/g, "$1cqw").replace(/(\d)vh\b/g, "$1cqh"),
      );
    }
    expect(stage().style.getPropertyValue("--cap-font-size")).toBe(
      fontSizeVar(52).replaceAll("vw", "cqw"),
    );
  });

  it("scales the 1920-pixel screen into the preview, and again when the preview is resized", async () => {
    await load();
    expect(stage().style.getPropertyValue("--k")).toBe("0.50000");
    setProperty($(".capdemo"), "clientWidth", 384);
    resizeAll();
    expect(stage().style.getPropertyValue("--k")).toBe("0.20000");
  });

  it("dresses the screen in a preset's own layout, with its Arabic line, sized like the caption page", async () => {
    await load();
    const scrolled = vi.spyOn(Element.prototype, "scrollIntoView");
    chip("lower-third").click();
    expect(look()).toEqual({
      preset: ["lower-third"],
      layout: ["rollup"],
      behind: ["camera"],
      blocks: null,
      rollup: "cap-root pos-bottom bg-band",
      arabic: true,
      size: "44",
      src: true,
      quran: true,
    });
    // in the sideways-scrolling row of themes, the chosen one comes into view
    expect(scrolled.mock.contexts).toEqual([chip("lower-third")]);
    expect(scrolled).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    // two lines of 48 px Arabic (line height 1.55) and of 44 px text (the theme's 1.3)
    const box = (sel: string) => ({
      window: $(`${sel} .cap-window`).style.getPropertyValue("height"),
      pad: $(`${sel} .cap-window`).style.getPropertyValue("padding-bottom"),
      font: $(`${sel} .cap-text`).style.getPropertyValue("font-size"),
      line: $(`${sel} .cap-text`).style.getPropertyValue("line-height"),
    });
    expect(box(".cap-source")).toEqual({
      window: "148px",
      pad: "14px",
      font: "48px",
      line: "74px",
    });
    expect(box(".cap-translation")).toEqual({
      window: "114px",
      pad: "13px",
      font: "44px",
      line: "57px",
    });
  });

  it("switches the layout, bringing the layout's own background", async () => {
    await load();
    $('[data-layout="rollup"]').click();
    expect(look()).toMatchObject({
      layout: ["rollup"],
      blocks: null,
      rollup: "cap-root pos-bottom bg-band",
    });
    $('[data-layout="blocks"]').click();
    expect(look()).toMatchObject({ layout: ["blocks"], rollup: null });
    chip("cinema").click();
    expect(look()).toMatchObject({ layout: ["rollup"], rollup: "cap-root pos-bottom bg-shadow" });
    $('[data-layout="blocks"]').click();
    expect(look().blocks).toBe("blk-root pos-bottom bg-panel show-target quran-ar");
  });

  it("puts the screen over black, white, a camera or nothing", async () => {
    await load("nl");
    for (const behind of ["black", "white", "transparent", "camera"]) {
      $(`[data-behind="${behind}"]`).click();
      expect($(".capdemo").dataset.behind).toBe(behind);
      expect(look().behind).toEqual([behind]);
    }
    delete $('[data-behind="black"]').dataset.behind;
    $(".cd-btn:not([data-behind]):not([data-layout])").click();
    expect($(".capdemo").dataset.behind).toBe("camera");
  });

  it("changes the size, the Arabic line and the Quran in Arabic", async () => {
    await load();
    change("#cd-size", "input", (i) => {
      i.value = "70";
    });
    expect(stage().style.getPropertyValue("--cap-font-size")).toBe(
      fontSizeVar(70).replaceAll("vw", "cqw"),
    );
    expect($(".cap-translation .cap-text").style.getPropertyValue("font-size")).toBe("70px");
    change("#cd-src", "change", (i) => {
      i.checked = true;
    });
    expect(look()).toMatchObject({
      src: true,
      blocks: "blk-root pos-bottom bg-panel show-both quran-ar",
    });
    change("#cd-quran", "change", (i) => {
      i.checked = false;
    });
    expect(look()).toMatchObject({
      quran: false,
      blocks: "blk-root pos-bottom bg-panel show-both",
    });
    // a new theme brings its own size back
    chip("high-contrast").click();
    expect(look()).toMatchObject({ size: "60", src: false, quran: false });
  });

  it("shows only a theme's last blocks when it limits them, and its Quran accent", async () => {
    await load();
    const off = () =>
      [...document.querySelectorAll(".capdemo .blk")].map((b) => b.classList.contains("is-off"));
    const accent = () => $(".capdemo .blk-quran").classList.contains("has-accent");
    expect([off(), accent()]).toEqual([[false, false, false], true]);
    chip("large-print").click();
    expect([off(), accent()]).toEqual([[true, false, false], true]);
    chip("minimal-transparent").click();
    expect([off(), accent()]).toEqual([[false, false, false], false]);
  });

  it("keeps the newest block at the bottom, as the caption page does", async () => {
    await load("ar", () => setProperty($(".capdemo .blk-scroll"), "scrollHeight", 640));
    const scroller = $(".capdemo .blk-scroll");
    expect(scroller.scrollTop).toBe(0);
    env.frames.tick();
    expect(scroller.scrollTop).toBe(640);
  });

  it("ignores a theme the script does not know", async () => {
    await load("en", () => {
      chip("glass").dataset.preset = "retired";
    });
    $('.cd-chip[data-preset="retired"]').click();
    expect(look().preset).toEqual([DEFAULT_PRESET_ID]);
  });
});
