// @vitest-environment happy-dom
// The two small demos of the home page (site/client/demos.ts): the verse, whose words light up as
// they are recited before the translation settles, and the prayer screen, which cycles Athan,
// Iqama and Salah and stops a while on the one the visitor picks.
import { afterEach, describe, expect, it } from "vitest";
import type { SiteLang } from "../../site/content/khutbah.js";
import { DICTS } from "../../site/content/strings.js";
import { cleanup, type Env, install, intersect, showPage } from "./helpers/site-client-env.js";

let env: Env;

async function load(o: { reduce?: boolean; lang?: SiteLang } = {}) {
  env = install(o);
  showPage("home", o.lang ?? "en");
  const motion = await import("../../site/client/motion.js");
  const demos = await import("../../site/client/demos.js");
  return { ...demos, motion };
}

afterEach(cleanup);

const $ = (selector: string): HTMLElement => {
  const node = document.querySelector<HTMLElement>(selector);
  if (node === null) throw new Error(`no ${selector}`);
  return node;
};

describe("site: the verse demo", () => {
  const verse = () => ({
    lit: [...document.querySelectorAll("#verse-demo .vd-ar .w")].filter((w) =>
      w.classList.contains("lit"),
    ).length,
    words: document.querySelectorAll("#verse-demo .vd-ar .w").length,
    translation: $("#verse-demo .vd-tr").classList.contains("on"),
  });

  it("recites the verse word by word, then the translation settles, then it starts again", async () => {
    const { verseDemo } = await load();
    verseDemo($("#verse-demo"));
    expect($("#verse-demo").classList.contains("ready")).toBe(true);
    expect(verse()).toEqual({ lit: 1, words: 11, translation: false });
    env.frames.tick();
    // a word every 520 ms
    env.frames.run(1560, 52);
    expect(verse()).toMatchObject({ lit: 4, translation: false });
    // the translation after four words and 300 ms
    env.frames.run(832, 52);
    expect(verse()).toMatchObject({ lit: 5, translation: true });
    env.frames.run(3328, 52);
    expect(verse()).toMatchObject({ lit: 11, translation: true });
    // after a 3.8 s hold, a blank pause, then the verse again
    env.frames.run(3848, 52);
    expect(verse()).toMatchObject({ lit: 0, translation: false });
    env.frames.run(1404, 52);
    expect(verse()).toMatchObject({ lit: 1, translation: false });
  });

  it("shows the whole verse while paused, and goes on where it was", async () => {
    const { verseDemo, motion } = await load();
    verseDemo($("#verse-demo"));
    env.frames.tick();
    env.frames.run(1040, 52);
    expect(verse().lit).toBe(3);
    motion.setPaused(true);
    expect(verse()).toMatchObject({ lit: 11, translation: true });
    env.frames.run(5000, 52);
    expect(verse()).toMatchObject({ lit: 11, translation: true });
    motion.setPaused(false);
    expect(verse()).toMatchObject({ lit: 3, translation: false });
  });

  it("waits while it is out of view", async () => {
    const { verseDemo } = await load();
    verseDemo($("#verse-demo"));
    env.frames.tick();
    intersect($("#verse-demo"), false);
    env.frames.run(3000, 52);
    expect(verse().lit).toBe(1);
    intersect($("#verse-demo"), true);
    env.frames.run(520, 52);
    expect(verse().lit).toBe(2);
  });

  it("shows the whole verse, still, under reduced motion", async () => {
    const { verseDemo } = await load({ reduce: true });
    verseDemo($("#verse-demo"));
    expect(verse()).toEqual({ lit: 11, words: 11, translation: true });
    expect(env.frames.pending).toBe(0);
  });
});

describe("site: the prayer screen demo", () => {
  const screen = () => ({
    card: $("#prayer-demo .tj-screen").dataset.card,
    on: [...document.querySelectorAll<HTMLElement>("#prayer-demo [data-moment]")]
      .filter((b) => b.classList.contains("on"))
      .map((b) => b.dataset.moment),
    pressed: [...document.querySelectorAll("#prayer-demo [data-moment]")].map((b) =>
      b.getAttribute("aria-pressed"),
    ),
  });
  const button = (moment: string): HTMLElement => $(`#prayer-demo [data-moment="${moment}"]`);

  it("starts on the Iqama and goes on to Salah and the Athan every 3.2 s", async () => {
    const { prayerDemo } = await load({ lang: "ar" });
    expect(button("athan").textContent).toBe(DICTS.ar.m_athan);
    prayerDemo($("#prayer-demo"));
    expect(screen()).toEqual({ card: "iqama", on: ["iqama"], pressed: ["false", "true", "false"] });
    env.frames.tick();
    env.frames.run(3200, 50);
    expect(screen().card).toBe("iqama");
    env.frames.tick(50);
    expect(screen()).toEqual({ card: "salah", on: ["salah"], pressed: ["false", "false", "true"] });
    env.frames.run(3250, 50);
    expect(screen().card).toBe("athan");
    env.frames.run(3250, 50);
    expect(screen().card).toBe("iqama");
  });

  it("shows the moment the visitor picks, and stays on it a little longer", async () => {
    const { prayerDemo } = await load();
    prayerDemo($("#prayer-demo"));
    env.frames.tick();
    env.frames.run(3000, 50);
    button("athan").click();
    expect(screen()).toEqual({ card: "athan", on: ["athan"], pressed: ["true", "false", "false"] });
    env.frames.run(7200, 50);
    expect(screen().card).toBe("athan");
    env.frames.tick(50);
    expect(screen().card).toBe("iqama");
  });

  it("waits while paused or out of view", async () => {
    const { prayerDemo, motion } = await load();
    prayerDemo($("#prayer-demo"));
    env.frames.tick();
    motion.setPaused(true);
    env.frames.run(10_000, 50);
    expect(screen().card).toBe("iqama");
    motion.setPaused(false);
    intersect($("#prayer-demo"), false);
    env.frames.run(10_000, 50);
    expect(screen().card).toBe("iqama");
    intersect($("#prayer-demo"), true);
    env.frames.run(3250, 50);
    expect(screen().card).toBe("salah");
  });

  it("only changes when clicked under reduced motion", async () => {
    const { prayerDemo } = await load({ reduce: true });
    prayerDemo($("#prayer-demo"));
    expect(env.frames.pending).toBe(0);
    button("salah").click();
    expect(screen()).toEqual({ card: "salah", on: ["salah"], pressed: ["false", "false", "true"] });
  });

  it("starts on the Iqama without a card, and on the Athan with one it does not know", async () => {
    const { prayerDemo } = await load({ reduce: true });
    delete $("#prayer-demo .tj-screen").dataset.card;
    prayerDemo($("#prayer-demo"));
    expect(screen().card).toBe("iqama");
    cleanup();
    const again = await load({ reduce: true });
    $("#prayer-demo .tj-screen").dataset.card = "jumuah";
    button("salah").dataset.moment = "jumuah";
    again.prayerDemo($("#prayer-demo"));
    expect(screen().card).toBe("athan");
    $('#prayer-demo [data-moment="jumuah"]').click();
    expect(screen().card).toBe("athan");
  });
});
