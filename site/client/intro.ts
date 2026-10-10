// The logo intro over the board: the background dots gather into the arch, the mark draws itself,
// then it glides to its place at the top of the board's divider. About 3.5 s; it calls `onLanded`
// when the mark has arrived (or at once under reduced motion).
import { ARCH_PATH } from "../../web/shared/brand.js";
import { el, tokenRgb } from "./dom.js";
import type { Lattice } from "./dots.js";
import { ease, reduceMotion, seg } from "./motion.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface IntroOptions {
  lattice: () => Lattice;
  /** The board: the dots come from around it and the mark is drawn at its centre. */
  area: HTMLElement;
  /** Where the mark lands (the small mark in the board's header). */
  home: Element;
  size: number;
  onLanded: () => void;
}

function path(d: string, cls: string): SVGPathElement {
  const p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", d);
  p.setAttribute("class", cls);
  return p;
}

function px(node: HTMLElement | SVGElement, props: Record<string, number>): void {
  for (const [k, v] of Object.entries(props)) node.style.setProperty(k, `${v}px`);
}

export function playIntro(o: IntroOptions): void {
  if (reduceMotion) {
    o.onLanded();
    return;
  }
  const big = document.createElementNS(SVG_NS, "svg");
  big.setAttribute("viewBox", "8 1 48 63");
  big.setAttribute("class", "intro-mark");
  big.setAttribute("aria-hidden", "true");
  const arch = path(ARCH_PATH, "b-arch");
  // The upper (Arabic) line is drawn from the right, like the script.
  const l1 = path("M43 33H31", "b-l1");
  const l2 = path("M21 42H39", "b-l2");
  big.append(arch, l1, l2);
  const canvas = el("canvas", "intro-dots");
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas, big);

  const sx = window.scrollX;
  const sy = window.scrollY;
  const area = o.area.getBoundingClientRect();
  const size = Math.min(o.size, area.height * 0.5);
  const bw = (size * 48) / 63;
  const bx = area.left + area.width / 2 - bw / 2 + sx;
  const by = area.top + area.height / 2 - size / 2 + sy;
  px(big, { left: bx, top: by, width: bw, height: size });

  // The canvas covers the board and a margin around it, but never past the viewport's sides.
  const pad = 60;
  const x0 = Math.max(0, area.left - pad);
  const x1 = Math.min(document.documentElement.clientWidth, area.right + pad);
  const ax = x0 + sx;
  const ay = area.top - pad + sy;
  const aw = x1 - x0;
  const ah = area.height + pad * 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(aw * dpr);
  canvas.height = Math.round(ah * dpr);
  px(canvas, { left: ax, top: ay, width: aw, height: ah });
  const ctx = canvas.getContext("2d");
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pine = tokenRgb("--tj-g800");

  const lengths = new Map<SVGPathElement, number>();
  for (const p of [arch, l1, l2]) {
    const len = p.getTotalLength();
    lengths.set(p, len);
    p.style.setProperty("stroke-dasharray", String(len));
    p.style.setProperty("stroke-dashoffset", String(len));
  }
  const draw = (p: SVGPathElement, v: number): void => {
    p.style.setProperty("stroke-dashoffset", String((lengths.get(p) ?? 0) * (1 - v)));
  };

  // Source dots: the background lattice around the board; targets: points along the arch.
  const lat = o.lattice();
  const y0 = area.top - pad;
  const sources: Array<{ x: number; y: number; used: boolean }> = [];
  for (let y = lat.oy; y < y0 + ah; y += lat.sp) {
    if (y < y0) continue;
    for (let x = lat.ox; x < x1; x += lat.sp) {
      if (x >= x0) sources.push({ x: x + sx, y: y + sy, used: false });
    }
  }
  const scale = size / 63;
  const archLen = lengths.get(arch) ?? 0;
  const pairs: Array<{ fx: number; fy: number; tx: number; ty: number; delay: number }> = [];
  const K = 104;
  for (let i = 0; i < K; i++) {
    const p = arch.getPointAtLength((archLen * i) / K);
    const tx = bx + (p.x - 8) * scale;
    const ty = by + (p.y - 1) * scale;
    let best: (typeof sources)[number] | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const d of sources) {
      if (d.used) continue;
      const dist = Math.hypot(d.x - tx, d.y - ty) + Math.random() * 46;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    if (best !== null) {
      best.used = true;
      pairs.push({ fx: best.x, fy: best.y, tx, ty, delay: Math.random() * 300 });
    }
  }

  let t0: number | null = null;
  let flying = false;
  const finish = (): void => {
    canvas.remove();
    big.remove();
    o.onLanded();
  };
  const frame = (now: number): void => {
    t0 ??= now;
    const t = now - t0;
    if (ctx !== null) {
      ctx.clearRect(0, 0, aw, ah);
      const fade = 1 - ease.inOut(seg(t, 1250, 1800));
      if (fade > 0) {
        for (const q of pairs) {
          const m = ease.inOut(seg(t, q.delay, q.delay + 900));
          ctx.fillStyle = `rgba(${pine}, ${((0.12 + 0.78 * m) * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(
            q.fx + (q.tx - q.fx) * m - ax,
            q.fy + (q.ty - q.fy) * m - ay,
            1.1 + 0.6 * m,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
    draw(arch, ease.inOut(seg(t, 1050, 1750)));
    draw(l1, ease.out(seg(t, 1650, 2080)));
    draw(l2, ease.out(seg(t, 1780, 2210)));
    if (t >= 2550 && !flying) {
      flying = true;
      const home = o.home.getBoundingClientRect();
      const b = big.getBoundingClientRect();
      const flight = big.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          {
            transform: `translate(${home.left - b.left}px, ${home.top - b.top}px) scale(${home.height / b.height})`,
          },
        ],
        { duration: 950, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" },
      );
      flight.onfinish = finish;
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
