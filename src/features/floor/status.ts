import type { TableState } from "@/lib/status";

import type { FloorTable } from "./types";

/**
 * Table state from a floor_live() row (spec §5.2). When several apply, the most
 * urgent wins:
 *   Call waiter > New order > Ready > Paid > Bill > Cooking > Confirmed > Eating > Seated > Free
 * "Paid" (due 0, not closed) and "Confirmed" are placed where the spec's list
 * leaves room; see PROGRESS.md.
 */
export const STATE_PRIORITY: readonly TableState[] = [
  "call_waiter",
  "new_order",
  "ready",
  "paid",
  "bill_requested",
  "cooking",
  "confirmed",
  "eating",
  "seated",
  "free",
];

export interface TableStatus {
  state: TableState;
  /** Lower = more urgent (index in STATE_PRIORITY). */
  priority: number;
  /** When the current state started (for age timers); null for free tables. */
  since: string | null;
  counts: {
    newOrders: number;
    ready: number;
    cooking: number;
    calls: number;
    items: number;
    /** Online payments a manager must verify. */
    toReview: number;
  };
  /** New order waiting longer than 2 minutes (pulses red). */
  overdue: boolean;
}

const CALL_TYPES = new Set(["call_waiter", "water", "cutlery", "other"]);
export const OVERDUE_NEW_ORDER_MS = 2 * 60_000;

const oldest = (values: (string | null | undefined)[]): string | null =>
  values
    .filter((v): v is string => !!v)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

export function tableStatus(row: FloorTable, nowMs: number): TableStatus {
  const s = row.session;
  const counts = { newOrders: 0, ready: 0, cooking: 0, calls: 0, items: 0, toReview: 0 };
  if (!s)
    return {
      state: "free",
      priority: STATE_PRIORITY.indexOf("free"),
      since: null,
      counts,
      overdue: false,
    };

  const placed = s.orders.filter((o) => o.status === "placed");
  const ready = s.orders.filter((o) => o.status === "ready");
  const cooking = s.orders.filter((o) => o.status === "in_kitchen" || o.status === "preparing");
  const confirmed = s.orders.filter((o) => o.status === "confirmed");
  const served = s.orders.filter((o) => o.status === "served");
  const calls = s.open_requests.filter((r) => r.status === "open" && CALL_TYPES.has(r.type));
  const billReq = s.open_requests.filter((r) => r.type === "request_bill");
  counts.newOrders = placed.length;
  counts.ready = ready.length;
  counts.cooking = cooking.length;
  counts.calls = calls.length;
  counts.items = s.orders.reduce((n, o) => n + o.item_count, 0);
  counts.toReview = s.pending_review ?? 0;

  const paid = s.bill.total_minor > 0 && s.bill.due_minor === 0 && s.bill.unconfirmed_orders === 0;

  let state: TableState;
  let since: string | null;
  if (calls.length) [state, since] = ["call_waiter", oldest(calls.map((r) => r.created_at))];
  else if (placed.length) [state, since] = ["new_order", oldest(placed.map((o) => o.placed_at))];
  else if (ready.length) [state, since] = ["ready", oldest(ready.map((o) => o.ready_at))];
  else if (paid) [state, since] = ["paid", null];
  else if (billReq.length || s.status === "billing")
    [state, since] = ["bill_requested", oldest(billReq.map((r) => r.created_at))];
  else if (cooking.length) [state, since] = ["cooking", oldest(cooking.map((o) => o.sent_at))];
  else if (confirmed.length)
    [state, since] = ["confirmed", oldest(confirmed.map((o) => o.confirmed_at))];
  else if (served.length) [state, since] = ["eating", oldest(served.map((o) => o.served_at))];
  else [state, since] = ["seated", s.opened_at];

  const oldestPlaced = oldest(placed.map((o) => o.placed_at));
  const overdue = !!oldestPlaced && nowMs - new Date(oldestPlaced).getTime() > OVERDUE_NEW_ORDER_MS;

  return { state, priority: STATE_PRIORITY.indexOf(state), since, counts, overdue };
}

export function occupancy(rows: readonly FloorTable[]): { occupied: number; total: number } {
  return { occupied: rows.filter((r) => r.session).length, total: rows.length };
}
