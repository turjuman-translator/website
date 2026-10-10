// "Your screens, your style": the real caption page (its markup and CSS, see site/render) drawn at
// 1920×1080 and scaled into a 16:9 preview, wearing the app's built-in presets. Only options the
// caption page really has are offered.
import { BUILTIN_PRESETS, DEFAULT_PRESET_ID, fontSizeVar } from "../../src/shared/theme.js";
import {
  type Behind,
  containerUnits,
  type DemoState,
  demoOptions,
  demoPreset,
  type LineBox,
  presetShowsSource,
  rollupBoxes,
  varNumber,
} from "./caption-theme.js";
import { find, findAll } from "./dom.js";

const STAGE_WIDTH = 1920;

function setBox(block: HTMLElement, box: LineBox, lines: number): void {
  const win = find(".cap-window", HTMLElement, block);
  const text = find(".cap-text", HTMLElement, block);
  win.style.setProperty("height", `${lines * box.lineHeightPx}px`);
  win.style.setProperty("padding-bottom", `${Math.round(box.fontPx * 0.3)}px`);
  text.style.setProperty("font-size", `${box.fontPx}px`);
  text.style.setProperty("line-height", `${box.lineHeightPx}px`);
}

function press(buttons: readonly HTMLElement[], attr: string, value: string): void {
  for (const b of buttons) b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
}

export function captionStyleDemo(root: HTMLElement): void {
  const frame = find(".capdemo", HTMLElement, root);
  const stage = find(".capdemo-stage", HTMLElement, frame);
  const blocks = find(".blk-root", HTMLElement, stage);
  const scroller = find(".blk-scroll", HTMLElement, blocks);
  const listen = find(".blk-listen", HTMLElement, blocks);
  const rollup = find(".cap-root", HTMLElement, stage);
  const source = find(".cap-source", HTMLElement, rollup);
  const target = find(".cap-translation", HTMLElement, rollup);
  const chips = findAll(".cd-chip", HTMLButtonElement, root);
  const layoutButtons = findAll("[data-layout]", HTMLButtonElement, root);
  const behindButtons = findAll("[data-behind]", HTMLButtonElement, root);
  const sizeInput = find("#cd-size", HTMLInputElement, root);
  const srcInput = find("#cd-src", HTMLInputElement, root);
  const quranInput = find("#cd-quran", HTMLInputElement, root);

  const st: DemoState = {
    preset: DEFAULT_PRESET_ID,
    layout: null,
    size: null,
    src: false,
    quran: true,
    behind: "camera",
  };

  const apply = (): void => {
    const p = demoPreset(st.preset);
    const o = demoOptions(p, st);
    for (const [name, value] of Object.entries(p.vars)) {
      if (value !== undefined) stage.style.setProperty(name, containerUnits(value));
    }
    stage.style.setProperty("--cap-font-size", containerUnits(fontSizeVar(o.size)));

    blocks.hidden = o.layout !== "blocks";
    rollup.hidden = o.layout !== "rollup";
    blocks.className = `blk-root pos-${o.pos} bg-${o.bg} show-${o.show}${o.quranArabic ? " quran-ar" : ""}`;
    listen.classList.toggle("with-partial", o.partial);
    for (const q of findAll(".blk-quran", HTMLElement, blocks)) {
      q.classList.toggle("has-accent", o.quranAccent);
    }
    const items = findAll(".blk", HTMLElement, blocks);
    items.forEach((b, i) => {
      b.classList.toggle("is-off", o.visibleBlocks > 0 && i < items.length - o.visibleBlocks);
    });
    rollup.className = `cap-root pos-${o.pos} bg-${o.bg}`;
    source.hidden = o.show !== "both";
    const boxes = rollupBoxes(
      o.size,
      varNumber(p, "--cap-line-height"),
      varNumber(p, "--cap-src-scale"),
    );
    setBox(source, boxes.source, o.lines);
    setBox(target, boxes.target, o.lines);

    frame.dataset.behind = st.behind;
    press(chips, "data-preset", p.id);
    press(layoutButtons, "data-layout", o.layout);
    press(behindButtons, "data-behind", st.behind);
    sizeInput.value = String(o.size);
    srcInput.checked = st.src;
    quranInput.checked = st.quran;
    // The newest block sits at the bottom, as on the caption page.
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
  };

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const p = BUILTIN_PRESETS.find((x) => x.id === chip.dataset.preset);
      if (p === undefined) return;
      st.preset = p.id;
      st.layout = null;
      st.size = null;
      st.src = presetShowsSource(p);
      apply();
      // In the sideways-scrolling row (tablets, phones), the chosen theme comes fully into view.
      chip.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
  for (const b of layoutButtons) {
    b.addEventListener("click", () => {
      st.layout = b.dataset.layout === "rollup" ? "rollup" : "blocks";
      apply();
    });
  }
  for (const b of behindButtons) {
    b.addEventListener("click", () => {
      st.behind = (b.dataset.behind ?? "camera") as Behind;
      apply();
    });
  }
  sizeInput.addEventListener("input", () => {
    st.size = Number(sizeInput.value);
    apply();
  });
  srcInput.addEventListener("change", () => {
    st.src = srcInput.checked;
    apply();
  });
  quranInput.addEventListener("change", () => {
    st.quran = quranInput.checked;
    apply();
  });

  const fitStage = (): void => {
    stage.style.setProperty("--k", (frame.clientWidth / STAGE_WIDTH).toFixed(5));
  };
  new ResizeObserver(fitStage).observe(frame);
  fitStage();
  apply();
}
