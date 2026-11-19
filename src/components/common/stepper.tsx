"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

import { localizeDigits } from "@/lib/digits";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Item name for the accessible label ("Quantity of Mango Lassi"). */
  itemName?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/** Quantity stepper (1–20 by default), 44 px targets, animated number bump. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  itemName,
  size = "md",
  disabled = false,
  className,
}: StepperProps) {
  const t = useTranslations("controls");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;
  const btn =
    "relative inline-flex items-center justify-center rounded-full text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div
      role="group"
      aria-label={itemName ? t("quantityOf", { name: itemName }) : t("quantity")}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface-2 p-0.5",
        className,
      )}
    >
      <button
        type="button"
        className={cn(btn, size === "md" ? "size-11" : "size-9 after:absolute after:-inset-1")}
        onClick={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        aria-label={t("decrease")}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden font-semibold tabular-nums",
          size === "md" ? "h-11 w-9 text-base" : "h-9 w-7 text-sm",
        )}
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value}
            initial={reduce ? { opacity: 0 } : { y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 12, opacity: 0 }}
            transition={spring.snappy}
          >
            {localizeDigits(value, locale)}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        className={cn(btn, size === "md" ? "size-11" : "size-9 after:absolute after:-inset-1")}
        onClick={() => canInc && onChange(value + 1)}
        disabled={!canInc}
        aria-label={t("increase")}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
