"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { MoneyText } from "@/components/common/money-text";
import { Stepper } from "@/components/common/stepper";
import { Button } from "@/components/ui/button";
import { localizeDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

import { useAdjustItems } from "../order-actions";
import type { BoardOrder } from "../types";

/**
 * Lines of an order. Editable (stepper / remove) only before the kitchen has it.
 * Changes are batched into one waiter_adjust_items call; 0 voids a line.
 */
export function LinesEditor({ order, editable }: { order: BoardOrder; editable: boolean }) {
  const t = useTranslations("staff");
  const locale = useLocale();
  const adjust = useAdjustItems();
  const [draft, setDraft] = useState<Record<string, number>>({});
  const live = order.order_items.filter((i) => !i.is_voided);
  const qty = (id: string, fallback: number) => draft[id] ?? fallback;
  const changes = live
    .filter((i) => draft[i.id] !== undefined && draft[i.id] !== i.quantity)
    .map((i) => ({ order_item_id: i.id, quantity: draft[i.id] ?? i.quantity }));
  const allRemoved = live.length > 0 && live.every((i) => qty(i.id, i.quantity) === 0);

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {order.order_items.map((item) => {
          const q = item.is_voided ? 0 : qty(item.id, item.quantity);
          const removed = q === 0;
          const mods = item.modifiers.map((m) =>
            locale === "bn" && m.name_bn ? m.name_bn : m.name,
          );
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border p-3",
                removed && "opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", removed && "line-through")}>
                  {!editable || item.is_voided
                    ? `${localizeDigits(item.quantity, locale)}× `
                    : null}
                  {item.name_snapshot}
                </p>
                {mods.length ? (
                  <p className="text-sm text-muted-foreground">{mods.join(" · ")}</p>
                ) : null}
                {item.note ? <p className="text-sm font-medium text-ember">{item.note}</p> : null}
                {removed ? <p className="text-xs text-muted-foreground">{t("removed")}</p> : null}
              </div>
              {editable && !item.is_voided ? (
                <div className="flex items-center gap-1">
                  {removed ? (
                    <IconButton
                      label={t("restoreLine", { name: item.name_snapshot })}
                      size="icon-sm"
                      onClick={() => setDraft((d) => ({ ...d, [item.id]: item.quantity }))}
                    >
                      <RotateCcw aria-hidden />
                    </IconButton>
                  ) : (
                    <>
                      <Stepper
                        size="sm"
                        value={q}
                        onChange={(v) => setDraft((d) => ({ ...d, [item.id]: v }))}
                        itemName={item.name_snapshot}
                      />
                      <IconButton
                        label={t("removeLine", { name: item.name_snapshot })}
                        size="icon-sm"
                        variant="destructive-soft"
                        onClick={() => setDraft((d) => ({ ...d, [item.id]: 0 }))}
                      >
                        <Trash2 aria-hidden />
                      </IconButton>
                    </>
                  )}
                </div>
              ) : (
                <MoneyText
                  minor={item.line_total_minor}
                  className="text-sm text-muted-foreground"
                />
              )}
            </li>
          );
        })}
      </ul>
      {editable && changes.length > 0 ? (
        <div className="space-y-2 rounded-xl bg-muted p-3">
          {allRemoved ? (
            <p className="text-sm font-medium text-ember">{t("allRemovedWarning")}</p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft({})}>
              {t("discardChanges")}
            </Button>
            <Button
              className="flex-1"
              loading={adjust.isPending}
              onClick={() =>
                adjust.mutate({ orderId: order.id, changes }, { onSuccess: () => setDraft({}) })
              }
            >
              {t("saveChanges")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
