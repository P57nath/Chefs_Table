import type { OrderStatus } from "@/lib/status";

import type { GuestOrder } from "./types";

export type Stage = "sent" | "confirmed" | "cooking" | "ready" | "served" | "cancelled";

export const STAGE_OF: Record<OrderStatus, Stage> = {
  placed: "sent",
  confirmed: "confirmed",
  in_kitchen: "cooking",
  preparing: "cooking",
  ready: "ready",
  served: "served",
  cancelled: "cancelled",
};

const DEFAULT_PREP_MIN = 15;

export type Eta = { kind: "minutes"; minutes: number } | { kind: "soon" } | { kind: "late" } | null;

/** Longest prep time among the order's live (non-voided) lines. */
export function maxPrepMinutes(order: GuestOrder): number {
  const preps = order.order_items
    .filter((i) => !i.is_voided)
    .map((i) => i.menu_items?.prep_minutes ?? DEFAULT_PREP_MIN);
  return preps.length ? Math.max(...preps) : DEFAULT_PREP_MIN;
}

/**
 * Estimated time to ready: max prep_minutes counted from `sent_at` (spec §4.5).
 * Before the order reaches the kitchen we show the full prep time.
 */
export function etaFor(order: GuestOrder, nowMs: number): Eta {
  if (order.status === "ready" || order.status === "served" || order.status === "cancelled") {
    return null;
  }
  const prep = maxPrepMinutes(order);
  if (!order.sent_at) return { kind: "minutes", minutes: prep };
  const remainingMs = new Date(order.sent_at).getTime() + prep * 60_000 - nowMs;
  const remaining = Math.ceil(remainingMs / 60_000);
  if (remaining > 2) return { kind: "minutes", minutes: remaining };
  if (remaining > -5) return { kind: "soon" };
  return { kind: "late" };
}

const ACTIVE: ReadonlySet<OrderStatus> = new Set([
  "placed",
  "confirmed",
  "in_kitchen",
  "preparing",
  "ready",
]);

/** The order the illustrated stage follows: newest active one, else newest served, else newest. */
export function focusOrder(orders: readonly GuestOrder[]): GuestOrder | null {
  const newestFirst = [...orders].sort(
    (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
  );
  return (
    newestFirst.find((o) => ACTIVE.has(o.status)) ??
    newestFirst.find((o) => o.status === "served") ??
    newestFirst[0] ??
    null
  );
}

export interface TimelineStep {
  key: "placed" | "confirmed" | "cooking" | "ready" | "served";
  at: string | null;
  state: "done" | "current" | "todo";
}

const ORDER: TimelineStep["key"][] = ["placed", "confirmed", "cooking", "ready", "served"];
const STEP_INDEX: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  in_kitchen: 2,
  preparing: 2,
  ready: 3,
  served: 4,
  cancelled: -1,
};

export function timeline(order: GuestOrder): TimelineStep[] {
  const at: Record<TimelineStep["key"], string | null> = {
    placed: order.placed_at,
    confirmed: order.confirmed_at,
    cooking: order.preparing_at ?? order.sent_at,
    ready: order.ready_at,
    served: order.served_at,
  };
  const current = STEP_INDEX[order.status];
  return ORDER.map((key, i) => ({
    key,
    at: at[key],
    state:
      i < current || (i === current && key === "served")
        ? "done"
        : i === current
          ? "current"
          : "todo",
  }));
}

/** Orders whose status changed between two snapshots (for haptics/sound/announcements). */
export function statusChanges(
  previous: ReadonlyMap<string, OrderStatus>,
  next: readonly GuestOrder[],
): GuestOrder[] {
  return next.filter((o) => previous.has(o.id) && previous.get(o.id) !== o.status);
}
