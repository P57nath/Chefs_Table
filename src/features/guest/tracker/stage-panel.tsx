"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

import { localizeDigits } from "@/lib/digits";
import { spring } from "@/lib/motion";
import { formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { StageScene } from "./stage-scene";
import { etaFor, STAGE_OF, timeline, type Stage } from "./tracker-model";
import type { GuestOrder } from "./types";

const CAPTION: Record<Stage, string> = {
  sent: "stageSent",
  confirmed: "stageConfirmed",
  cooking: "stageCooking",
  ready: "stageReady",
  served: "stageServed",
  cancelled: "stageCancelled",
};

const STEP_LABEL = {
  placed: "timelinePlaced",
  confirmed: "timelineConfirmed",
  cooking: "timelineCooking",
  ready: "timelineReady",
  served: "timelineServed",
} as const;

/** The "wow" panel: illustrated stage, caption + ETA, and the vertical timeline. */
export function StagePanel({ order }: { order: GuestOrder }) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const now = useNow();
  const stage = STAGE_OF[order.status];
  const eta = now === null ? null : etaFor(order, now);
  const caption = t(CAPTION[stage] as "stageSent");

  return (
    <section
      aria-labelledby="stage-caption"
      className="surface-raised space-y-4 rounded-3xl border border-border bg-card p-4"
    >
      <StageScene stage={stage} label={caption} />
      <div aria-live="polite" className="space-y-1 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={stage}
            id="stage-caption"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring.soft}
            className="font-display text-2xl font-semibold"
          >
            {caption}
          </motion.h2>
        </AnimatePresence>
        {eta ? (
          <p className="text-muted-foreground tabular-nums">
            {eta.kind === "minutes"
              ? t("eta", { minutes: localizeDigits(eta.minutes, locale) })
              : eta.kind === "soon"
                ? t("etaSoon")
                : t("etaLate")}
          </p>
        ) : null}
        {order.status === "cancelled" && order.cancel_reason ? (
          <p className="text-sm text-muted-foreground">
            {t("cancelReason", { reason: order.cancel_reason })}
          </p>
        ) : null}
      </div>

      {order.status !== "cancelled" ? (
        <ol className="mx-auto max-w-xs space-y-0">
          {timeline(order).map((step, i, all) => (
            <li key={step.key} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {i < all.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-7 left-[13px] h-[calc(100%-1.25rem)] w-0.5",
                    step.state === "done" ? "bg-success" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  step.state === "done" && "border-success bg-success text-white",
                  step.state === "current" &&
                    "animate-status-pulse border-primary bg-primary/15 text-primary",
                  step.state === "todo" && "border-border bg-surface",
                )}
              >
                {step.state === "done" ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <div className="flex flex-1 items-baseline justify-between gap-2 pt-0.5">
                <span
                  className={cn("font-medium", step.state === "todo" && "text-muted-foreground")}
                >
                  {t(STEP_LABEL[step.key])}
                </span>
                {step.at ? (
                  <time dateTime={step.at} className="text-sm text-muted-foreground tabular-nums">
                    {formatClock(step.at, locale)}
                  </time>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
