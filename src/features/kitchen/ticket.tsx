"use client";

import { Check, Flame, ConciergeBell, MessageSquareWarning } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

import { Timer } from "@/components/common/timer";
import { Button } from "@/components/ui/button";
import { localizeDigits } from "@/lib/digits";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useKitchenAdvance, useTickItem } from "./kitchen-data";
import { liveItems, ticketSince, type KitchenOrder } from "./kitchen-model";

/** KDS ticket (rendered as the list item so exit/slide animations work): huge table label, age timer (10/20 min bands), tappable lines, Start / Ready. */
export function Ticket({ order }: { order: KitchenOrder }) {
  const t = useTranslations("kitchen");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const advance = useKitchenAdvance();
  const tick = useTickItem();
  const table = order.dining_tables?.label ?? "";
  const ready = order.status === "ready";
  const busy = advance.isPending;

  return (
    <motion.li
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={spring.soft}
      className="list-none"
    >
      <article
        data-order-id={order.id}
        aria-label={t("ticketLabel", { table, no: localizeDigits(order.order_no, locale) })}
        className={cn(
          "space-y-3 rounded-2xl border-2 bg-card p-4",
          ready
            ? "border-success/60 opacity-80"
            : order.status === "preparing"
              ? "border-cooking/60"
              : "border-border",
        )}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-5xl leading-none font-semibold">{table}</p>
            <p className="mt-1 text-lg text-muted-foreground tabular-nums">
              {t("orderNo", { no: localizeDigits(order.order_no, locale) })}
            </p>
          </div>
          {ready ? (
            <ConciergeBell className="size-10 text-success" aria-hidden />
          ) : (
            <Timer
              since={ticketSince(order)}
              warnAtMin={10}
              lateAtMin={20}
              className="text-4xl font-bold"
            />
          )}
        </header>

        {order.customer_note ? (
          <p className="flex items-start gap-2 rounded-xl bg-primary/20 p-3 text-xl font-semibold">
            <MessageSquareWarning className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="sr-only">{t("guestNote")}: </span>
              {order.customer_note}
            </span>
          </p>
        ) : null}

        <ul className="space-y-2">
          {liveItems(order).map((item) => {
            const mods = item.modifiers.map((m) => m.name);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={ready || tick.isPending}
                  aria-pressed={item.is_done}
                  aria-label={
                    item.is_done
                      ? t("itemDone", { name: item.name_snapshot })
                      : t("itemTodo", { name: item.name_snapshot })
                  }
                  onClick={() => tick.mutate({ itemId: item.id, done: !item.is_done })}
                  className={cn(
                    "flex min-h-16 w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/60",
                    item.is_done
                      ? "bg-success/15 text-muted-foreground"
                      : "bg-surface-2 hover:bg-muted",
                  )}
                >
                  <span className="w-12 shrink-0 text-[1.875rem] leading-tight font-bold tabular-nums">
                    {localizeDigits(item.quantity, locale)}×
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-[1.75rem] leading-tight font-semibold",
                        item.is_done && "line-through",
                      )}
                    >
                      {item.name_snapshot}
                    </span>
                    {mods.length ? (
                      <span className="block text-xl font-semibold text-primary">
                        {mods.join(" · ")}
                      </span>
                    ) : null}
                    {item.note ? (
                      <span className="mt-1 block rounded-lg bg-ember/25 px-2 py-0.5 text-xl font-semibold">
                        {item.note}
                      </span>
                    ) : null}
                  </span>
                  {item.is_done ? (
                    <Check
                      className="mt-1 size-8 shrink-0 text-success"
                      strokeWidth={3}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {ready ? null : (
          <div className="grid auto-cols-fr grid-flow-col gap-2 pt-1">
            {order.status === "in_kitchen" ? (
              <Button
                size="xl"
                variant="secondary"
                className="h-16 min-w-0 px-3 text-xl"
                disabled={busy}
                onClick={() => advance.mutate({ order, to: "preparing" })}
              >
                <Flame className="size-6" aria-hidden />
                {t("start")}
              </Button>
            ) : null}
            <Button
              size="xl"
              className="h-16 min-w-0 bg-success px-3 text-xl text-[var(--primary-ink)] hover:bg-success/90"
              disabled={busy}
              onClick={() => advance.mutate({ order, to: "ready" })}
            >
              <ConciergeBell className="size-6" aria-hidden />
              {t("ready")}
            </Button>
          </div>
        )}
      </article>
    </motion.li>
  );
}
