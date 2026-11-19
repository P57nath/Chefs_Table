"use client";

import { Check, ChevronsRight, Loader2 } from "lucide-react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef, useState, type MouseEvent } from "react";

import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Phase = "idle" | "pending" | "done";

interface SlideToConfirmProps {
  /** Visible instruction inside the track and the handle's accessible name. */
  label: string;
  /** Shown while `onConfirm` is running. */
  pendingLabel?: string;
  doneLabel?: string;
  /** May be async; a rejection resets the control so the user can retry. */
  onConfirm: () => unknown | Promise<unknown>;
  disabled?: boolean;
  className?: string;
}

const HANDLE = 56; // px — the draggable knob
const THRESHOLD = 0.85;

/**
 * "Slide to place order": prevents accidental taps on touch screens.
 * Keyboard / switch / screen-reader users activate the handle with Enter or
 * Space (an intentional act); a plain mouse click without dragging only nudges
 * the handle as a hint.
 */
export function SlideToConfirm({
  label,
  pendingLabel,
  doneLabel,
  onConfirm,
  disabled = false,
  className,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [maxX, setMaxX] = useState(0);
  const passedThreshold = useRef(false);
  const fill = useTransform(x, (v) => v + HANDLE);
  const labelOpacity = useTransform(x, [0, Math.max(maxX * 0.6, 1)], [1, 0]);

  const busy = phase !== "idle";
  const measure = () => {
    const width = trackRef.current?.clientWidth ?? 0;
    const max = Math.max(width - HANDLE - 8, 0);
    setMaxX(max);
    return max;
  };

  async function confirm() {
    if (busy || disabled) return;
    const max = maxX || measure();
    setPhase("pending");
    animate(x, max, reduce ? { duration: 0 } : spring.snappy);
    try {
      await onConfirm();
      setPhase("done");
    } catch {
      setPhase("idle");
      animate(x, 0, spring.sheet);
    }
  }

  function onDrag() {
    const max = maxX || measure();
    const crossed = max > 0 && x.get() / max >= THRESHOLD;
    // Haptic tick the moment the threshold is crossed (Android; iOS ignores vibrate).
    if (crossed && !passedThreshold.current) navigator.vibrate?.(10);
    passedThreshold.current = crossed;
  }

  function onDragEnd() {
    const max = maxX || measure();
    if (max > 0 && x.get() / max >= THRESHOLD) void confirm();
    else animate(x, 0, spring.sheet);
    passedThreshold.current = false;
  }

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    // detail === 0 → keyboard / assistive activation: treat as intentional.
    if (e.detail === 0) {
      void confirm();
      return;
    }
    if (busy || disabled || reduce) return;
    // Mouse/touch tap without dragging: nudge as a hint.
    animate(x, [0, 28, 0], { duration: 0.5 });
  }

  const statusText = phase === "pending" ? pendingLabel : phase === "done" ? doneLabel : label;

  return (
    <div
      ref={trackRef}
      onPointerEnter={measure}
      className={cn(
        "relative h-16 w-full touch-pan-y overflow-hidden rounded-full border border-border bg-surface-2 p-1 select-none",
        disabled && "opacity-50",
        className,
      )}
    >
      <m.div
        aria-hidden
        style={{ width: fill }}
        className="absolute inset-y-1 left-1 rounded-full bg-primary/20"
      />
      <m.span
        aria-hidden
        style={{ opacity: phase === "idle" ? labelOpacity : 1 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-[0.9375rem] font-semibold text-foreground"
      >
        {statusText}
      </m.span>
      <m.button
        type="button"
        aria-label={label}
        aria-disabled={disabled || busy || undefined}
        disabled={disabled}
        drag={busy || disabled ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragStart={measure}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onClick={onClick}
        style={{ x, width: HANDLE }}
        className="relative z-10 flex h-14 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow outline-none focus-visible:ring-3 focus-visible:ring-ring/60 active:cursor-grabbing"
      >
        {phase === "pending" ? (
          <Loader2 className="size-6 animate-spin" aria-hidden />
        ) : phase === "done" ? (
          <Check className="size-6" aria-hidden />
        ) : (
          <ChevronsRight className="size-6" aria-hidden />
        )}
      </m.button>
      <span className="sr-only" aria-live="polite">
        {phase !== "idle" ? statusText : ""}
      </span>
    </div>
  );
}
