"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Sticky header that slides away while you scroll down and returns the moment
 * you scroll up; it gains a solid surface once the hero has scrolled past.
 */
export function LandingHeader({
  logo,
  staffLabel,
  controls,
}: {
  logo: ReactNode;
  staffLabel: string;
  controls: ReactNode;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(!reduce && y > 240 && y > prev);
    setSolid(y > 40);
  });

  return (
    <m.header
      initial={false}
      animate={{ y: hidden ? "-100%" : "0%" }}
      transition={{ duration: 0.32, ease: EASE }}
      onFocusCapture={() => setHidden(false)}
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
        solid ? "bar-surface border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {logo}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="hidden h-11 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            {staffLabel}
          </Link>
          {controls}
        </div>
      </div>
    </m.header>
  );
}
