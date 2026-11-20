"use client";

import { CircleCheck } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";

import { tween } from "@/lib/motion";

/** Quiet confirmation when the bill reaches zero: one short rise, no confetti. */
export function PaidCelebration() {
  const t = useTranslations("bill");
  const reduce = useReducedMotion();
  return (
    <m.section
      role="status"
      initial={reduce ? false : { y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={tween.enter}
      className="rounded-2xl border border-border bg-card p-6 text-center"
    >
      <CircleCheck className="mx-auto size-10 text-success" strokeWidth={1.5} aria-hidden />
      <h2 className="mt-4 font-display text-2xl font-normal">{t("allPaidTitle")}</h2>
      <p className="mt-1 text-muted-foreground">{t("allPaidBody")}</p>
    </m.section>
  );
}
