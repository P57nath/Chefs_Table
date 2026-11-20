"use client";

import { ScanLine } from "lucide-react";
import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useRef } from "react";

/** A Mughal ogee arch (mihrab), as an SVG mask. */
const ARCH = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140'%3E%3Cpath d='M0 140V62C0 34 26 22 42 10 46 7 48 3 50 0c2 3 4 7 8 10 16 12 42 24 42 52v78Z'/%3E%3C/svg%3E")`;

/** Jali lattice: a tile of eight-point stars, drawn in the ink colour at low opacity. */
const JALI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%231a1206' stroke-opacity='.09' stroke-width='.6' d='M12 2l2.6 6.3L21 5l-3.3 6.4L22 12l-4.3.6L21 19l-6.4-3.3L12 22l-2.6-6.3L3 19l3.3-6.4L2 12l4.3-.6L3 5l6.4 3.3Z'/%3E%3C/svg%3E")`;

/**
 * The closing moment: a saffron room seen through a Mughal arch that opens as
 * you scroll until it fills the screen, with the call to sit down and scan.
 */
export function ArchReveal() {
  const t = useTranslations("landing");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const size = useTransform(scrollYProgress, [0.42, 0.95], ["36vmin", "280vmax"]);
  const scale = useTransform(scrollYProgress, [0.5, 0.95], [0.7, 1]);
  const textOpacity = useTransform(scrollYProgress, [0.5, 0.74], [0, 1]);

  const inner = (
    <div
      className="relative flex size-full flex-col items-center justify-center bg-primary px-6 text-center text-primary-foreground"
      style={{ backgroundImage: JALI }}
    >
      <m.div
        style={{ scale, opacity: textOpacity }}
        className="max-w-3xl motion-reduce:!transform-none motion-reduce:!opacity-100"
      >
        <h2 className="font-display text-[2.75rem] leading-[1.02] font-normal tracking-[-0.02em] sm:text-[5rem] lg:text-[6.5rem] lg:tracking-[-0.03em]">
          {t("archTitle")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-[1.6] opacity-80">{t("archBody")}</p>
        <p className="mt-10 inline-flex items-center gap-2 rounded-lg border border-current/25 px-4 py-3 text-[0.9375rem] font-medium">
          <ScanLine className="size-5" strokeWidth={1.5} aria-hidden />
          {t("scanTitle")}
        </p>
      </m.div>
    </div>
  );

  return (
    <section ref={ref} className="relative h-[220svh] motion-reduce:h-svh">
      <m.div
        className="sticky top-0 h-svh motion-reduce:![mask-image:none] motion-reduce:![-webkit-mask-image:none]"
        style={{
          maskImage: ARCH,
          WebkitMaskImage: ARCH,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center 62%",
          WebkitMaskPosition: "center 62%",
          maskSize: size,
          WebkitMaskSize: size,
        }}
      >
        {inner}
      </m.div>
    </section>
  );
}
