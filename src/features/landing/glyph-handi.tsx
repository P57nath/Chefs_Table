"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import {
  buildAtlas,
  buildParticles,
  easeInOut,
  easeOut,
  mulberry,
  type Particle,
  type Steam,
} from "./glyph-engine";

// Timeline (ms): letters assemble, the atta seal cracks, the lid lifts, steam rises.
const ASSEMBLE = 1100;
const SEAL_AT = 1750;
const LID_AT = 1900;
const LID_FOR = 950;
const RICE_AT = 2050;
const STEAM_AT = 2500;
const INTRO_END = 3600;
const REPEL_R = 70;

/**
 * Hero visual: a dum-sealed kacchi handi drawn entirely from the Bengali letters
 * of "কাচ্চি". Letters fly in like scattered rice and settle into the pot, the
 * atta seal crumbles, the lid lifts, the rice appears and steam curls rise.
 * The letters part around the pointer and spring back. Reduced motion → the
 * finished, open handi, drawn once. Pauses when off screen or the tab is hidden.
 */
export function GlyphHandi({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = wrap.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--font-noto-bengali").trim() ||
      "sans-serif";

    let size = 0;
    let cell = 9;
    let parts: Particle[] = [];
    let art: ReturnType<typeof buildAtlas> | null = null;
    const steam: Steam[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let start = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let cancelled = false;
    let steamDebt = 0;
    const rnd = mulberry(7);

    function setup() {
      size = Math.round(host!.clientWidth);
      if (!size) return;
      cell = size < 420 ? 7 : 9;
      canvas!.width = Math.round(size * dpr);
      canvas!.height = Math.round(size * dpr);
      parts = buildParticles(size, cell, mulberry(42));
      art = buildAtlas(cell, dpr, family);
    }

    function lidTransform(t: number) {
      const k = easeInOut((t - LID_AT) / LID_FOR);
      const px = 0.78 * size;
      const py = 0.34 * size;
      return { k, angle: -0.26 * k, dx: 0.06 * size * k, dy: -0.17 * size * k, px, py };
    }

    function draw(now: number) {
      if (!art) return;
      const t = reduce ? 1e9 : now - start;
      const dt = Math.min(48, now - last || 16);
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const s = art.s;
      const half = cell / 2;
      const lid = lidTransform(t);
      const cos = Math.cos(lid.angle);
      const sin = Math.sin(lid.angle);
      const seal = Math.max(0, Math.min(1, (t - SEAL_AT) / 900));
      const riceAlpha = easeOut((t - RICE_AT) / 700);
      let moving = false;

      for (const p of parts) {
        const k = easeOut((t - p.delay) / ASSEMBLE);
        let bx = p.sx + (p.tx - p.sx) * k;
        let by = p.sy + (p.ty - p.sy) * k;
        let alpha = Math.min(1, k * 1.6);
        if (p.group === "lid" && lid.k > 0) {
          const rx = bx - lid.px;
          const ry = by - lid.py;
          bx = lid.px + rx * cos - ry * sin + lid.dx;
          by = lid.py + rx * sin + ry * cos + lid.dy;
        } else if (p.group === "seal" && seal > 0) {
          bx += (p.seed - 0.5) * size * 0.12 * seal;
          by += seal * seal * size * (0.18 + p.seed * 0.2);
          alpha *= 1 - seal;
        } else if (p.group === "rice") {
          alpha *= riceAlpha;
        }
        if (alpha <= 0.02) continue;

        // pointer: letters part around it and spring back
        if (!reduce && k >= 1) {
          let ax = -0.02 * p.x - 0.16 * p.vx;
          let ay = -0.02 * p.y - 0.16 * p.vy;
          if (pointer.active) {
            const ddx = bx + p.x - pointer.x;
            const ddy = by + p.y - pointer.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < REPEL_R * REPEL_R && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1 - d / REPEL_R) * 1.6;
              ax += (ddx / d) * f;
              ay += (ddy / d) * f;
            }
          }
          const step = dt / 16;
          p.vx += ax * step;
          p.vy += ay * step;
          p.x += p.vx * step;
          p.y += p.vy * step;
          if (Math.abs(p.x) + Math.abs(p.y) + Math.abs(p.vx) + Math.abs(p.vy) > 0.05) moving = true;
          else p.x = p.y = p.vx = p.vy = 0;
        }

        // a few letters flicker, like grains catching the light
        let sprite = p.sprite;
        if (!reduce && t > INTRO_END && Math.sin(p.seed * 997 + now / 380) > 0.985) sprite += 1;
        const [sx, sy] = art.rect(sprite);
        ctx!.globalAlpha = alpha;
        ctx!.drawImage(
          art.atlas,
          sx,
          sy,
          s,
          s,
          (bx + p.x - half) * dpr,
          (by + p.y - half) * dpr,
          s,
          s,
        );
      }

      // steam curls rising off the rice
      if (!reduce && t > STEAM_AT) {
        steamDebt += dt * 0.045;
        while (steamDebt >= 1) {
          steamDebt -= 1;
          steam.push({
            x: size * (0.3 + rnd() * 0.4),
            y: size * (0.27 + rnd() * 0.05),
            age: 0,
            life: 2000 + rnd() * 1400,
            sway: rnd() * Math.PI * 2,
            sprite: Math.floor(rnd() * 3),
          });
        }
        for (let i = steam.length - 1; i >= 0; i--) {
          const m = steam[i]!;
          m.age += dt;
          if (m.age > m.life) {
            steam.splice(i, 1);
            continue;
          }
          const life = m.age / m.life;
          const y = m.y - life * size * 0.34;
          const x = m.x + Math.sin(m.sway + m.age / 420) * size * 0.025;
          const [sx, sy] = art.steamRect(m.sprite);
          ctx!.globalAlpha = Math.sin(life * Math.PI) * 0.95;
          ctx!.drawImage(art.atlas, sx, sy, s, s, (x - half) * dpr, (y - half) * dpr, s, s);
        }
      }
      ctx!.globalAlpha = 1;
      return moving || t < INTRO_END || pointer.active;
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      // full rate while something moves, 30 fps for idle steam
      const busy = now - start < INTRO_END || pointer.active;
      if (!busy && now - last < 33) return;
      draw(now);
      last = now;
    }

    const ro = new ResizeObserver(() => {
      const next = Math.round(host.clientWidth);
      if (next && Math.abs(next - size) > 8) {
        setup();
        if (reduce) draw(performance.now());
      }
    });
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    document.fonts
      .load(`500 16px ${family}`, "কাচ্চি")
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        setup();
        start = performance.now();
        last = start;
        if (reduce) {
          draw(start);
          ro.observe(host);
          return;
        }
        ro.observe(host);
        io.observe(canvas);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerleave", onLeave);
        raf = requestAnimationFrame(loop);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrap} className={cn("relative aspect-square w-full", className)}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full touch-pan-y" />
    </div>
  );
}
