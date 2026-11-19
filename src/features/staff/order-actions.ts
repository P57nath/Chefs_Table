"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AppErrorException, asAppError, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import type { OrderStatus } from "@/lib/status";
import { getBrowserSupabase } from "@/lib/supabase/client";

import type { BoardOrder } from "./types";

type Advance = { order: BoardOrder; to: OrderStatus; reason?: string };

const TOAST_KEY: Partial<
  Record<OrderStatus, "toastConfirmed" | "toastSent" | "toastServed" | "toastCancelled">
> = {
  confirmed: "toastConfirmed",
  in_kitchen: "toastSent",
  served: "toastServed",
  cancelled: "toastCancelled",
};

/**
 * Status changes through advance_order. Optimistic (card moves instantly), rolled
 * back on error. If someone else already moved the order (INVALID_TRANSITION) we
 * say so and refetch — the database decides who won.
 */
export function useAdvanceOrder() {
  const qc = useQueryClient();
  const t = useTranslations("staff");
  const tErr = useTranslations("errors");

  return useMutation({
    mutationFn: async ({ order, to, reason }: Advance) => {
      const { error } = await getBrowserSupabase().rpc("advance_order", {
        p_order_id: order.id,
        p_to: to,
        ...(reason ? { p_reason: reason } : {}),
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onMutate: async ({ order, to }) => {
      await qc.cancelQueries({ queryKey: qk.staffOrders() });
      const previous = qc.getQueryData<BoardOrder[]>(qk.staffOrders());
      const now = new Date().toISOString();
      qc.setQueryData<BoardOrder[]>(qk.staffOrders(), (list) =>
        (list ?? [])
          .filter((o) => !(o.id === order.id && to === "cancelled"))
          .map((o) =>
            o.id !== order.id
              ? o
              : {
                  ...o,
                  status: to,
                  confirmed_at:
                    o.confirmed_at ?? (to === "confirmed" || to === "in_kitchen" ? now : null),
                  sent_at: to === "in_kitchen" ? now : o.sent_at,
                  ready_at: to === "ready" ? now : o.ready_at,
                  served_at: to === "served" ? now : o.served_at,
                },
          ),
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.staffOrders(), ctx.previous);
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSuccess: (_data, { order, to }) => {
      const key = TOAST_KEY[to];
      if (key) toast.success(t(key, { table: order.dining_tables?.label ?? "" }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
}

/** Waiter edits before the kitchen: [{order_item_id, quantity}] — 0 voids a line. */
export function useAdjustItems() {
  const qc = useQueryClient();
  const t = useTranslations("staff");
  const tErr = useTranslations("errors");
  return useMutation({
    mutationFn: async ({
      orderId,
      changes,
    }: {
      orderId: string;
      changes: { order_item_id: string; quantity: number }[];
    }) => {
      const { error } = await getBrowserSupabase().rpc("waiter_adjust_items", {
        p_order_id: orderId,
        p_changes: changes,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onSuccess: () => toast.success(t("toastSaved")),
    onError: (err) => {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
}
