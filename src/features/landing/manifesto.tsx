"use client";

import { useScroll, useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";

function Word({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = Math.min(1, start + 1.5 / total);
  // Dimmed words stay ≥ 3:1 (large text, WCAG AA) in both themes.
  const opacity = useTransform(progress, [start, end], [0.5, 1]);
  const y = useTransform(progress, [start, end], [6, 0]);
  return (
    <m.span
      style={{ opacity, y }}
      className="inline-block whitespace-pre motion-reduce:!transform-none motion-reduce:!opacity-100"
    >
      {word}{" "}
    </m.span>
  );
}

/**
 * The brand's line, set huge; each word lights up as it scrolls through the
 * middle of the screen (screen readers get the plain paragraph).
 */
export function Manifesto({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-40 lg:px-8">
      <p
        ref={ref}
        className="font-display text-[1.875rem] leading-[1.2] font-normal tracking-[-0.01em] sm:text-[3rem] lg:text-[3.5rem] lg:tracking-[-0.02em]"
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden>
          {words.map((w, i) => (
            <Word key={i} word={w} index={i} total={words.length} progress={scrollYProgress} />
          ))}
        </span>
      </p>
    </section>
  );
}
