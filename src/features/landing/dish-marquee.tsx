"use client";

import {
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";

/** Eight-point Mughal star, the separator between dish names. */
function Star() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="mx-6 inline-block size-[0.42em] text-primary sm:mx-10"
    >
      <path
        fill="currentColor"
        d="M12 0l2.6 6.3L21 3l-3.3 6.4L24 12l-6.3 2.6L21 21l-6.4-3.3L12 24l-2.6-6.3L3 21l3.3-6.4L0 12l6.3-2.6L3 3l6.4 3.3Z"
      />
    </svg>
  );
}

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

/**
 * One row of giant dish names that drifts on its own and speeds up, flips
 * direction and leans (skew) with the page's scroll velocity.
 */
function Row({ items, base, outline }: { items: string[]; base: number; outline?: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skew = useTransform(velocity, [-2500, 2500], [12, -12]);
  const dir = useRef(1);
  const pos = useTransform(x, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < 0) dir.current = -1;
    else if (b > 0) dir.current = 1;
    x.set(x.get() + dir.current * base * (delta / 1000) * (1 + Math.abs(b)));
  });

  const line = (
    <span className="flex shrink-0 items-center pr-6 sm:pr-10">
      {items.map((d) => (
        <span key={d} className="flex items-center">
          {d}
          <Star />
        </span>
      ))}
    </span>
  );

  return (
    <div className="overflow-hidden">
      <m.div
        style={{ x: pos, skewX: skew }}
        className={
          outline
            ? "flex w-max font-display text-[3.25rem] leading-[1.15] whitespace-nowrap text-transparent [-webkit-text-stroke:1px_var(--text-subtle)] motion-reduce:!transform-none sm:text-[6.5rem]"
            : "flex w-max font-display text-[3.25rem] leading-[1.15] whitespace-nowrap motion-reduce:!transform-none sm:text-[6.5rem]"
        }
      >
        {line}
        {line}
      </m.div>
    </div>
  );
}

/** Velocity marquee of the menu's signature dishes (two rows, opposite directions). */
export function DishMarquee({ label, dishes }: { label: string; dishes: string[] }) {
  const half = Math.ceil(dishes.length / 2);
  return (
    <section aria-label={label} className="border-y border-border py-10 sm:py-14">
      <ul className="sr-only">
        {dishes.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <div aria-hidden className="space-y-2">
        <Row items={dishes} base={-3} />
        <Row items={[...dishes.slice(half), ...dishes.slice(0, half)]} base={3} outline />
      </div>
    </section>
  );
}
