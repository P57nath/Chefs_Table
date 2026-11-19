"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyText } from "@/components/common/money-text";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { localizeDigits } from "@/lib/digits";
import { asAppError } from "@/lib/errors";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

import type { GuestOrder } from "./types";
import { useCancelOrder } from "./use-guest-data";

/** One round of the table's orders: items, status, subtotal, cancel while still unconfirmed. */
export function OrderCard({ order, round }: { order: GuestOrder; round: number }) {
  const t = useTranslations("guest");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const cancel = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const n = (v: number | string) => localizeDigits(v, locale);

  async function doCancel() {
    try {
      await cancel.mutateAsync(order.id);
      toast.success(t("cancelled"));
    } catch (err) {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <article
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card p-4",
        order.status === "cancelled" && "opacity-70",
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{t("roundN", { n: n(round) })}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("orderNo", { no: n(order.order_no) })} · {formatClock(order.placed_at, locale)}
          </p>
        </div>
        <StatusPill kind="order" state={order.status} size="sm" />
      </header>
      <ul className="space-y-1.5">
        {order.order_items.map((item) => {
          const name =
            locale === "bn" && item.menu_items?.name_bn
              ? item.menu_items.name_bn
              : item.name_snapshot;
          const mods = item.modifiers.map((m) =>
            locale === "bn" && m.name_bn ? m.name_bn : m.name,
          );
          return (
            <li
              key={item.id}
              className={cn(
                "flex gap-2 text-sm",
                item.is_voided && "text-muted-foreground line-through",
              )}
            >
              <span className="w-7 shrink-0 font-semibold tabular-nums">{n(item.quantity)}×</span>
              <span className="flex-1">
                {name}
                {mods.length ? (
                  <span className="block text-muted-foreground">{mods.join(" · ")}</span>
                ) : null}
                {item.note ? (
                  <span className="block text-muted-foreground italic">
                    {t("notesLabel", { note: item.note })}
                  </span>
                ) : null}
                {item.is_voided ? <span className="block no-underline">{t("voided")}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {order.customer_note ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-sm">
          {t("notesLabel", { note: order.customer_note })}
        </p>
      ) : null}
      <footer className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <MoneyText minor={order.subtotal_minor} className="font-semibold" />
        {order.status === "placed" ? (
          <Button size="sm" variant="destructive-soft" onClick={() => setConfirmOpen(true)}>
            {t("cancelOrder")}
          </Button>
        ) : null}
      </footer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("cancelConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{t("keepOrder")}</Button>
            </DialogClose>
            <Button variant="destructive" loading={cancel.isPending} onClick={doCancel}>
              {t("cancelOrder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
