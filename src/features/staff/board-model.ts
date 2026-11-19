import type { StaffRole } from "@/features/auth/roles";
import type { OrderStatus } from "@/lib/status";

import type { BoardOrder, StaffRequest } from "./types";

export type ColumnKey = "new" | "confirmed" | "kitchen" | "ready" | "served";

export const COLUMNS: readonly { key: ColumnKey; statuses: readonly OrderStatus[] }[] = [
  { key: "new", statuses: ["placed"] },
  { key: "confirmed", statuses: ["confirmed"] },
  { key: "kitchen", statuses: ["in_kitchen", "preparing"] },
  { key: "ready", statuses: ["ready"] },
  { key: "served", statuses: ["served"] },
];

/** Group orders into kanban columns. New/ready oldest first (most urgent on top); served newest first. */
export function groupByColumn(orders: readonly BoardOrder[]): Record<ColumnKey, BoardOrder[]> {
  const out: Record<ColumnKey, BoardOrder[]> = {
    new: [],
    confirmed: [],
    kitchen: [],
    ready: [],
    served: [],
  };
  for (const o of orders) {
    const col = COLUMNS.find((c) => c.statuses.includes(o.status));
    if (col) out[col.key].push(o);
  }
  const byTime = (field: keyof BoardOrder, dir: 1 | -1) => (a: BoardOrder, b: BoardOrder) =>
    dir *
    (new Date(String(a[field] ?? a.placed_at)).getTime() -
      new Date(String(b[field] ?? b.placed_at)).getTime());
  out.new.sort(byTime("placed_at", 1));
  out.confirmed.sort(byTime("confirmed_at", 1));
  out.kitchen.sort(byTime("sent_at", 1));
  out.ready.sort(byTime("ready_at", 1));
  out.served.sort(byTime("served_at", -1));
  return out;
}

/** When the age timer on a card starts (time spent in its current column). */
export function columnSince(o: BoardOrder): string {
  switch (o.status) {
    case "confirmed":
      return o.confirmed_at ?? o.placed_at;
    case "in_kitchen":
    case "preparing":
      return o.sent_at ?? o.placed_at;
    case "ready":
      return o.ready_at ?? o.placed_at;
    case "served":
      return o.served_at ?? o.placed_at;
    default:
      return o.placed_at;
  }
}

/** Unacknowledged new orders older than 2 minutes pulse red (spec §5.2). */
export const STALE_NEW_ORDER_MS = 2 * 60_000;
export function isStaleNewOrder(o: BoardOrder, nowMs: number): boolean {
  return o.status === "placed" && nowMs - new Date(o.placed_at).getTime() > STALE_NEW_ORDER_MS;
}

export function liveItemCount(o: BoardOrder): number {
  return o.order_items.filter((i) => !i.is_voided).reduce((n, i) => n + i.quantity, 0);
}

export type Alert =
  | { kind: "new_order"; order: BoardOrder }
  | { kind: "ready"; order: BoardOrder }
  | { kind: "request"; request: StaffRequest };

export interface Snapshot {
  orders: ReadonlyMap<string, OrderStatus>;
  requests: ReadonlySet<string>;
}

export function snapshotOf(
  orders: readonly BoardOrder[],
  requests: readonly StaffRequest[],
): Snapshot {
  return {
    orders: new Map(orders.map((o) => [o.id, o.status])),
    requests: new Set(requests.map((r) => r.id)),
  };
}

/**
 * Alerts come from diffing two query snapshots, never from raw realtime events
 * (docs/02 §6). The first snapshot after load produces no alerts.
 */
export function diffAlerts(
  prev: Snapshot | null,
  orders: readonly BoardOrder[],
  requests: readonly StaffRequest[],
): Alert[] {
  if (!prev) return [];
  const alerts: Alert[] = [];
  for (const o of orders) {
    const before = prev.orders.get(o.id);
    if (before === undefined && o.status === "placed") alerts.push({ kind: "new_order", order: o });
    else if (before !== undefined && before !== "ready" && o.status === "ready")
      alerts.push({ kind: "ready", order: o });
  }
  for (const r of requests) {
    if (!prev.requests.has(r.id) && r.status === "open")
      alerts.push({ kind: "request", request: r });
  }
  return alerts;
}

/** Which actions a role may take on an order in its current status (mirrors advance_order). */
export function allowedActions(status: OrderStatus, role: StaffRole) {
  const floor = role === "waiter" || role === "cashier" || role === "manager" || role === "owner";
  const mgmt = role === "manager" || role === "owner";
  return {
    confirm: floor && status === "placed",
    confirmAndSend: floor && status === "placed",
    send: floor && status === "confirmed",
    serve: floor && status === "ready",
    reject: floor && (status === "placed" || status === "confirmed"),
    cancelInKitchen:
      mgmt && (status === "in_kitchen" || status === "preparing" || status === "ready"),
    editLines: floor && (status === "placed" || status === "confirmed"),
  };
}
