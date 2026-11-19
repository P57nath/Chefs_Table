"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useStaff } from "@/features/staff/staff-context";
import { AppErrorException, asAppError, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { READY_WINDOW_MS, type KitchenOrder } from "./kitchen-model";

const COLUMNS = `
  id, order_no, status, customer_note, sent_at, preparing_at, ready_at, placed_at,
  dining_tables ( label ),
  order_items ( id, name_snapshot, quantity, modifiers, note, is_voided, is_done )
`;

/** Open kitchen tickets + tickets that became ready in the last 10 minutes. */
export function useKitchenOrders() {
  const { staff, poll } = useStaff();
  return useQuery({
    queryKey: qk.kitchen(),
    refetchInterval: poll,
    queryFn: async (): Promise<KitchenOrder[]> => {
      const readySince = new Date(Date.now() - READY_WINDOW_MS).toISOString();
      const { data, error } = await getBrowserSupabase()
        .from("orders")
        .select(COLUMNS)
        .eq("restaurant_id", staff.restaurantId)
        .or(`status.in.(in_kitchen,preparing),and(status.eq.ready,ready_at.gte.${readySince})`)
        .order("sent_at", { ascending: true })
        .order("created_at", { referencedTable: "order_items", ascending: true });
      if (error) throw new AppErrorException(toAppError(error));
      return data as unknown as KitchenOrder[];
    },
  });
}

function useOptimistic() {
  const qc = useQueryClient();
  const tErr = useTranslations("errors");
  return {
    async begin(update: (list: KitchenOrder[]) => KitchenOrder[]) {
      await qc.cancelQueries({ queryKey: qk.kitchen() });
      const previous = qc.getQueryData<KitchenOrder[]>(qk.kitchen());
      qc.setQueryData<KitchenOrder[]>(qk.kitchen(), (list) => update(list ?? []));
      return { previous };
    },
    fail(err: unknown, ctx?: { previous?: KitchenOrder[] }) {
      if (ctx?.previous) qc.setQueryData(qk.kitchen(), ctx.previous);
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    settle: () => qc.invalidateQueries({ queryKey: qk.kitchen() }),
  };
}

/** Start (→ preparing) or bump (→ ready). */
export function useKitchenAdvance() {
  const o = useOptimistic();
  return useMutation({
    mutationFn: async ({ order, to }: { order: KitchenOrder; to: "preparing" | "ready" }) => {
      const { error } = await getBrowserSupabase().rpc("advance_order", {
        p_order_id: order.id,
        p_to: to,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onMutate: ({ order, to }) => {
      const now = new Date().toISOString();
      return o.begin((list) =>
        list.map((x) =>
          x.id !== order.id
            ? x
            : {
                ...x,
                status: to,
                preparing_at: to === "preparing" ? now : x.preparing_at,
                ready_at: to === "ready" ? now : x.ready_at,
                order_items:
                  to === "ready"
                    ? x.order_items.map((i) => ({ ...i, is_done: !i.is_voided }))
                    : x.order_items,
              },
        ),
      );
    },
    onError: (err, _v, ctx) => o.fail(err, ctx),
    onSettled: o.settle,
  });
}

/** Tick a line done / undo. */
export function useTickItem() {
  const o = useOptimistic();
  return useMutation({
    mutationFn: async ({ itemId, done }: { itemId: string; done: boolean }) => {
      const { error } = await getBrowserSupabase().rpc("set_order_item_done", {
        p_order_item_id: itemId,
        p_done: done,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onMutate: ({ itemId, done }) =>
      o.begin((list) =>
        list.map((x) => ({
          ...x,
          order_items: x.order_items.map((i) => (i.id === itemId ? { ...i, is_done: done } : i)),
        })),
      ),
    onError: (err, _v, ctx) => o.fail(err, ctx),
    onSettled: o.settle,
  });
}
