import type { Transition } from "motion/react";

/** Motion presets from docs/04-DESIGN-SYSTEM.md §5. */
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 30 },
  sheet: { type: "spring", stiffness: 300, damping: 32 },
  soft: { type: "spring", stiffness: 180, damping: 22 },
} as const satisfies Record<string, Transition>;

export const fade: Transition = { duration: 0.16, ease: "easeOut" };

/** 30 ms per child, capped at 8 children so long lists don't wait. */
export function staggerDelay(index: number): number {
  return Math.min(index, 8) * 0.03;
}
