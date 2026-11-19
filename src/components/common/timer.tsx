"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatElapsed, timerTone, type TimerTone } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<TimerTone, string> = {
  ok: "text-success",
  warn: "text-cooking",
  late: "text-ember",
};

interface TimerProps {
  /** Start of the timer (ISO string or Date). */
  since: string | Date;
  /** Minutes at which the timer turns amber / red (KDS: 10 / 20). */
  warnAtMin?: number;
  lateAtMin?: number;
  /** Colour by threshold (default) or inherit the surrounding colour. */
  toned?: boolean;
  className?: string;
}

/** Live, tabular elapsed-time readout. Never jumps width while ticking. */
export function Timer({
  since,
  warnAtMin = 10,
  lateAtMin = 20,
  toned = true,
  className,
}: TimerProps) {
  const now = useNow();
  const locale = useLocale();
  const t = useTranslations("timer");
  const start = since instanceof Date ? since.getTime() : new Date(since).getTime();

  if (now === null) {
    return (
      <span className={cn("tabular-nums opacity-0", className)} aria-hidden>
        0:00
      </span>
    );
  }

  const elapsed = now - start;
  const text = formatElapsed(elapsed, locale);
  return (
    <time
      dateTime={new Date(start).toISOString()}
      aria-label={t("elapsed", { time: text })}
      className={cn(
        "tabular-nums",
        toned && TONE_CLASS[timerTone(elapsed, warnAtMin, lateAtMin)],
        className,
      )}
    >
      {text}
    </time>
  );
}
