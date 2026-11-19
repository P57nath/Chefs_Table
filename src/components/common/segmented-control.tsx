"use client";

import { motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon. */
  ariaLabel?: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the whole group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Radio-group style segmented control with a sliding indicator; arrow keys move selection. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-full border border-border bg-surface-2 p-1", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
              size === "md"
                ? "h-9 px-4 text-sm after:absolute after:inset-x-0 after:-inset-y-1"
                : "h-8 px-3 text-[0.8125rem] after:absolute after:inset-x-0 after:-inset-y-1.5",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring.snappy}
                className="surface-raised absolute inset-0 rounded-full bg-surface shadow-sm"
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
