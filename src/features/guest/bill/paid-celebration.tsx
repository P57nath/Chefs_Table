"use client";

import { PartyPopper } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return { x: Math.cos(angle) * 90, y: Math.sin(angle) * 60, hue: i % 3 };
});
const SPARK_COLORS = ["var(--primary)", "var(--ember)", "var(--success)"];

/** Light, one-shot celebration when the bill reaches zero. Static with reduced motion. */
export function PaidCelebration() {
  const t = useTranslations("bill");
  const reduce = useReducedMotion();
  return (
    <section
      role="status"
      className="relative overflow-hidden rounded-3xl border border-success/40 bg-success/10 p-6 text-center"
    >
      {!reduce ? (
        <div aria-hidden className="pointer-events-none absolute top-12 left-1/2">
          {SPARKS.map((s, i) => (
            <motion.span
              key={i}
              className="absolute size-2 rounded-full"
              style={{ background: SPARK_COLORS[s.hue] }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: s.x, y: s.y, opacity: 0, scale: 0.4 }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
            />
          ))}
        </div>
      ) : null}
      <motion.div
        className="mx-auto grid size-16 place-items-center rounded-full bg-success/20 text-success"
        initial={reduce ? false : { scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
      >
        <PartyPopper className="size-8" aria-hidden />
      </motion.div>
      <h2 className="mt-3 font-display text-2xl font-semibold">{t("allPaidTitle")}</h2>
      <p className="text-muted-foreground">{t("allPaidBody")}</p>
    </section>
  );
}
