import {
  BadgeCheck,
  BellRing,
  CheckCheck,
  CircleDashed,
  ConciergeBell,
  Flame,
  Hand,
  Receipt,
  Users,
  Utensils,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Visual language for table/order states — identical in 3D, 2D, list, badges
 * and KDS (docs/04-DESIGN-SYSTEM.md §2). The *rules* that pick a table's state
 * live in features/floor/status.ts (Phase 6); this file only maps state → look.
 */
export const TABLE_STATES = [
  "call_waiter",
  "new_order",
  "ready",
  "bill_requested",
  "cooking",
  "confirmed",
  "eating",
  "paid",
  "seated",
  "free",
] as const;
export type TableState = (typeof TABLE_STATES)[number];

export type Pulse = "none" | "slow" | "fast";

export interface StatusVisual {
  icon: LucideIcon;
  /** Tailwind text colour class (drives `currentColor` for dots, rings and pulses). */
  tone: string;
  /** Solid background class for dots/rings. */
  fill: string;
  pulse: Pulse;
}

export const STATUS_VISUALS: Record<TableState, StatusVisual> = {
  free: { icon: CircleDashed, tone: "text-free", fill: "bg-free", pulse: "none" },
  seated: { icon: Users, tone: "text-seated", fill: "bg-seated", pulse: "none" },
  new_order: { icon: BellRing, tone: "text-primary", fill: "bg-primary", pulse: "slow" },
  confirmed: { icon: CheckCheck, tone: "text-info", fill: "bg-info", pulse: "none" },
  cooking: { icon: Flame, tone: "text-cooking", fill: "bg-cooking", pulse: "none" },
  ready: { icon: ConciergeBell, tone: "text-success", fill: "bg-success", pulse: "slow" },
  eating: { icon: Utensils, tone: "text-eating", fill: "bg-eating", pulse: "none" },
  bill_requested: { icon: Receipt, tone: "text-violet", fill: "bg-violet", pulse: "none" },
  call_waiter: { icon: Hand, tone: "text-ember", fill: "bg-ember", pulse: "fast" },
  paid: { icon: BadgeCheck, tone: "text-success", fill: "bg-success", pulse: "none" },
};

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "in_kitchen",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Order status → the table-state look it shares. */
export const ORDER_STATUS_LOOK: Record<OrderStatus, TableState | "cancelled"> = {
  placed: "new_order",
  confirmed: "confirmed",
  in_kitchen: "cooking",
  preparing: "cooking",
  ready: "ready",
  served: "eating",
  cancelled: "cancelled",
};

export const CANCELLED_VISUAL: StatusVisual = {
  icon: XCircle,
  tone: "text-muted-foreground",
  fill: "bg-muted-foreground",
  pulse: "none",
};

export function orderStatusVisual(status: OrderStatus): StatusVisual {
  const look = ORDER_STATUS_LOOK[status];
  return look === "cancelled" ? CANCELLED_VISUAL : STATUS_VISUALS[look];
}

export const PULSE_CLASS: Record<Pulse, string> = {
  none: "",
  slow: "animate-status-pulse",
  fast: "animate-status-pulse-fast",
};
