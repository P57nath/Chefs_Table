"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("@/lib/motion-features").then((m) => m.default);

/**
 * `m.*` components render immediately and start animating once the features
 * (incl. drag + layout) arrive — keeps ~30 KB of Motion out of the guest's
 * first load (spec §8 budget).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
