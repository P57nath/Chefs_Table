import type { OrderStatus } from "@/lib/status";

export interface OrderModifier {
  group: string;
  name: string;
  name_bn: string | null;
  price_delta_minor: number;
}

export interface GuestOrderItem {
  id: string;
  name_snapshot: string;
  quantity: number;
  modifiers: OrderModifier[];
  note: string | null;
  is_voided: boolean;
  line_total_minor: number;
  /** From the live menu row (null if the item was archived). */
  menu_items: { name_bn: string | null; prep_minutes: number } | null;
}

export interface GuestOrder {
  id: string;
  order_no: number;
  status: OrderStatus;
  placed_at: string;
  confirmed_at: string | null;
  sent_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  customer_note: string | null;
  subtotal_minor: number;
  order_items: GuestOrderItem[];
}

export interface GuestRequest {
  id: string;
  type: "call_waiter" | "request_bill" | "water" | "cutlery" | "other";
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
}
