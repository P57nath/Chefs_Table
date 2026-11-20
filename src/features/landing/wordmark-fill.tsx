"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";

/**
 * Footer signature: the restaurant name set edge to edge as an outline that
 * fills with solid saffron, left to right, as the page reaches its end.
 */
export function WordmarkFill({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const clip = useTransform(scrollYProgress, [0.1, 0.9], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const cls =
    "block font-display text-[17vw] leading-[0.95] font-normal tracking-[-0.04em] whitespace-nowrap";

  return (
    <div ref={ref} aria-hidden className="relative overflow-hidden px-4 pt-16 sm:px-6 lg:px-8">
      <span className={`${cls} text-transparent [-webkit-text-stroke:1px_var(--text-subtle)]`}>
        {name}
      </span>
      <m.span
        style={{ clipPath: clip }}
        className={`${cls} absolute inset-x-4 top-16 text-primary motion-reduce:![clip-path:none] sm:inset-x-6 lg:inset-x-8`}
      >
        {name}
      </m.span>
    </div>
  );
}
