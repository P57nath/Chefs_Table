"use client";

import { ChefHat, ConciergeBell, MessageSquareText, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";
import { Timer } from "@/components/common/timer";
import { Button } from "@/components/ui/button";
import { localizeDigits } from "@/lib/digits";
import { PULSE_CLASS } from "@/lib/status";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { allowedActions, columnSince, isStaleNewOrder, liveItemCount } from "../board-model";
import { useAdvanceOrder } from "../order-actions";
import { useStaff } from "../staff-context";
import type { BoardOrder } from "../types";

const THRESHOLDS: Record<string, [number, number]> = {
  placed: [1, 2],
  confirmed: [2, 5],
  in_kitchen: [10, 20],
  preparing: [10, 20],
  ready: [2, 5],
  served: [9999, 9999],
};

/** Kanban card: table, order no, age timer, items, total + the one most likely action. */
export function BoardCard({
  order,
  onOpen,
}: {
  order: BoardOrder;
  onOpen: (o: BoardOrder) => void;
}) {
  const t = useTranslations("staff");
  const locale = useLocale();
  const now = useNow();
  const { staff } = useStaff();
  const advance = useAdvanceOrder();
  const can = allowedActions(order.status, staff.role);
  const stale = now !== null && isStaleNewOrder(order, now);
  const [warn, late] = THRESHOLDS[order.status] ?? [10, 20];
  const table = order.dining_tables?.label ?? "";

  const quick = can.confirmAndSend
    ? { to: "in_kitchen" as const, label: t("confirmAndSend"), icon: ChefHat }
    : can.send
      ? { to: "in_kitchen" as const, label: t("send"), icon: Send }
      : can.serve
        ? { to: "served" as const, label: t("markServed"), icon: ConciergeBell }
        : null;

  return (
    <article
      data-order-id={order.id}
      className={cn(
        "relative space-y-3 rounded-2xl border bg-card p-3",
        stale ? cn("border-ember text-ember", PULSE_CLASS.fast) : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(order)}
        className="block w-full space-y-1 text-left text-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-medium">{table}</span>
          <Timer
            since={columnSince(order)}
            warnAtMin={warn}
            lateAtMin={late}
            className="text-sm font-medium"
          />
        </span>
        <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            #{localizeDigits(order.order_no, locale)} ·{" "}
            {t("itemsCount", { count: liveItemCount(order) })}
          </span>
          <MoneyText minor={order.subtotal_minor} className="font-medium text-foreground" />
        </span>
        {order.customer_note ? (
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <MessageSquareText className="size-4 shrink-0 text-primary-text" aria-hidden />
            <span className="line-clamp-1">{order.customer_note}</span>
          </span>
        ) : null}
      </button>
      {quick ? (
        <Button
          size="sm"
          className="relative z-10 w-full"
          variant={order.status === "placed" ? "default" : "secondary"}
          loading={advance.isPending}
          onClick={() => advance.mutate({ order, to: quick.to })}
        >
          <quick.icon aria-hidden />
          {quick.label}
        </Button>
      ) : null}
    </article>
  );
}
