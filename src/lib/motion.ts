import type { Transition } from "motion/react";

/**
 * Motion presets (docs/04-DESIGN-SYSTEM.md §5): one ease-out curve, three
 * durations, no springs or overshoot. Motion explains a change; it never loops
 * unless the thing it marks is live.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const tween = {
  /** Hover, press, toggles, steppers, segmented thumbs. */
  quick: { duration: 0.16, ease: EASE },
  /** Sheets, bars and drawers entering or settling. */
  sheet: { duration: 0.32, ease: EASE },
  /** Content entering: cards, tracker stages, tickets. */
  enter: { duration: 0.4, ease: EASE },
} as const satisfies Record<string, Transition>;

export const fade: Transition = { duration: 0.16, ease: EASE };

/** 40 ms per child, capped at 6 children so long lists don't wait. */
export function staggerDelay(index: number): number {
  return Math.min(index, 6) * 0.04;
}
