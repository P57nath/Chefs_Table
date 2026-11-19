"use client";

import { Trash2 } from "lucide-react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";

import { IconButton } from "@/components/common/icon-button";
import { MoneyText } from "@/components/common/money-text";
import { Stepper } from "@/components/common/stepper";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { CartLine as Line } from "./cart-store";

interface CartLineProps {
  line: Line;
  soldOut: boolean;
  frozen: boolean;
  onQuantity: (q: number) => void;
  onRemove: () => void;
}

const SWIPE_REMOVE = -96;

/** Cart row: swipe left to remove (plus a visible remove button for everyone else). */
export function CartLineRow({ line, soldOut, frozen, onQuantity, onRemove }: CartLineProps) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [SWIPE_REMOVE, -24, 0], [1, 0.4, 0]);
  const name = locale === "bn" && line.nameBn ? line.nameBn : line.name;
  const labels = locale === "bn" ? line.modifierLabels.bn : line.modifierLabels.en;

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <m.div
        aria-hidden
        style={{ opacity: revealOpacity }}
        className="absolute inset-0 flex items-center justify-end rounded-2xl bg-ember pr-5 text-white"
      >
        <Trash2 className="size-5" />
      </m.div>
      <m.div
        drag={frozen || reduce ? false : "x"}
        dragConstraints={{ left: SWIPE_REMOVE * 1.5, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={() => {
          if (x.get() <= SWIPE_REMOVE) onRemove();
          else animate(x, 0, spring.snappy);
        }}
        className={cn(
          "relative flex gap-3 rounded-2xl border bg-card p-3",
          soldOut ? "border-ember" : "border-border",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="leading-snug font-semibold">{name}</p>
          {labels.length > 0 ? (
            <p className="text-sm text-muted-foreground">{labels.join(" · ")}</p>
          ) : null}
          {line.note ? (
            <p className="text-sm text-muted-foreground italic">
              {t("notesLabel", { note: line.note })}
            </p>
          ) : null}
          {soldOut ? <p className="text-sm font-semibold text-ember">{t("soldOutLine")}</p> : null}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Stepper
              size="sm"
              value={line.quantity}
              onChange={onQuantity}
              itemName={name}
              disabled={frozen}
            />
            <MoneyText minor={line.unitPriceMinor * line.quantity} className="font-semibold" />
          </div>
        </div>
        <IconButton
          label={t("removeLine", { name })}
          size="icon-sm"
          variant={soldOut ? "destructive-soft" : "ghost"}
          disabled={frozen}
          onClick={onRemove}
          className="-mt-1 -mr-1"
        >
          <Trash2 aria-hidden />
        </IconButton>
      </m.div>
    </li>
  );
}
