"use client";

import { useState } from "react";

/**
 * Shared hover/keyboard cursor for SVG charts: the pointer snaps to the
 * nearest data position, arrow keys / Home / End move it, Escape clears.
 * One tab stop per chart.
 */
export function useChartCursor(count: number, xOf: (i: number) => number, width: number) {
  const [active, setActive] = useState<number | null>(null);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * width;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < count; i++) {
      const d = Math.abs(xOf(i) - x);
      if (d < dist) [best, dist] = [i, d];
    }
    setActive(best);
  }

  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    const map: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(count - 1, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => count - 1,
    };
    if (e.key === "Escape") return setActive(null);
    const move = map[e.key];
    if (!move) return;
    e.preventDefault();
    setActive((i) => move(i ?? (e.key === "ArrowLeft" ? count : -1)));
  }

  return {
    active,
    handlers: {
      onPointerMove,
      onPointerLeave: () => setActive(null),
      onKeyDown,
      onBlur: () => setActive(null),
      tabIndex: 0,
    },
  };
}
