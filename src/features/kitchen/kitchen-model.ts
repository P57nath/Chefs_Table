import type { OrderModifier } from "@/features/guest/tracker/types";
import type { OrderStatus } from "@/lib/status";

export interface KitchenItem {
  id: string;
  name_snapshot: string;
  quantity: number;
  modifiers: OrderModifier[];
  note: string | null;
  is_voided: boolean;
  is_done: boolean;
}

export interface KitchenOrder {
  id: string;
  order_no: number;
  status: OrderStatus;
  customer_note: string | null;
  sent_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  placed_at: string;
  dining_tables: { label: string } | null;
  order_items: KitchenItem[];
}

/** Ready tickets stay visible for 10 minutes (spec §6). */
export const READY_WINDOW_MS = 10 * 60_000;

export interface KitchenColumns {
  new: KitchenOrder[];
  preparing: KitchenOrder[];
  ready: KitchenOrder[];
}

const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);

/** Oldest ticket first in New/Preparing (cook in order); newest first in Ready. */
export function groupKitchen(orders: readonly KitchenOrder[], nowMs: number): KitchenColumns {
  const cols: KitchenColumns = { new: [], preparing: [], ready: [] };
  for (const o of orders) {
    if (o.status === "in_kitchen") cols.new.push(o);
    else if (o.status === "preparing") cols.preparing.push(o);
    else if (o.status === "ready" && nowMs - ts(o.ready_at) <= READY_WINDOW_MS) cols.ready.push(o);
  }
  cols.new.sort((a, b) => ts(a.sent_at) - ts(b.sent_at));
  cols.preparing.sort((a, b) => ts(a.sent_at) - ts(b.sent_at));
  cols.ready.sort((a, b) => ts(b.ready_at) - ts(a.ready_at));
  return cols;
}

/** Live lines a cook still has to make. */
export function liveItems(o: KitchenOrder): KitchenItem[] {
  return o.order_items.filter((i) => !i.is_voided);
}

/** "All day": remaining quantity per dish across open tickets (not done, not voided). */
export function allDay(orders: readonly KitchenOrder[]): { name: string; quantity: number }[] {
  const totals = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== "in_kitchen" && o.status !== "preparing") continue;
    for (const i of liveItems(o)) {
      if (i.is_done) continue;
      totals.set(i.name_snapshot, (totals.get(i.name_snapshot) ?? 0) + i.quantity);
    }
  }
  return [...totals.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

/** Tickets that just arrived in the kitchen (diff of snapshots; nothing on first load). */
export function newTickets(
  previous: ReadonlySet<string> | null,
  orders: readonly KitchenOrder[],
): KitchenOrder[] {
  if (!previous) return [];
  return orders.filter((o) => o.status === "in_kitchen" && !previous.has(o.id));
}

/** Ticket age: since it reached the kitchen. */
export function ticketSince(o: KitchenOrder): string {
  return o.sent_at ?? o.placed_at;
}
