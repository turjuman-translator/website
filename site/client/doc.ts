// The text pages' small helpers: "On this page" marks the section you are reading, and on a phone
// the self-host stepper scrolls its current step into view.
import { findAll } from "./dom.js";

export function tocSpy(): void {
  const links = findAll(".toc a", HTMLAnchorElement);
  if (links.length === 0 || !("IntersectionObserver" in window)) return;
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const visible = new Set<string>();
  const mark = (): void => {
    // the first section in the reading order that is on screen
    const id = [...byId.keys()].find((k) => visible.has(k));
    for (const [k, a] of byId) {
      if (k === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      mark();
    },
    { rootMargin: "-15% 0px -55% 0px" },
  );
  for (const id of byId.keys()) {
    const section = document.getElementById(id);
    if (section !== null) io.observe(section);
  }
}

export function stepperIntoView(): void {
  const current = document.querySelector('.stepper a[aria-current="step"]');
  const row = current?.closest("ol");
  if (!(current instanceof HTMLElement) || !(row instanceof HTMLElement)) return;
  if (row.scrollWidth <= row.clientWidth) return;
  // scroll the row only, never the page
  const r = current.getBoundingClientRect();
  const box = row.getBoundingClientRect();
  row.scrollLeft += r.left + r.width / 2 - (box.left + box.width / 2);
}
