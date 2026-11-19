import type { OrderModifier } from "@/features/guest/tracker/types";
import type { OrderStatus } from "@/lib/status";

export interface BoardOrderItem {
  id: string;
  name_snapshot: string;
  quantity: number;
  modifiers: OrderModifier[];
  note: string | null;
  is_voided: boolean;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface BoardOrder {
  id: string;
  order_no: number;
  status: OrderStatus;
  placed_at: string;
  confirmed_at: string | null;
  sent_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  customer_note: string | null;
  subtotal_minor: number;
  session_id: string;
  table_id: string;
  dining_tables: { label: string } | null;
  order_items: BoardOrderItem[];
}

export type RequestType = "call_waiter" | "request_bill" | "water" | "cutlery" | "other";

export interface StaffRequest {
  id: string;
  type: RequestType;
  status: "open" | "acknowledged" | "resolved";
  note: string | null;
  created_at: string;
  acknowledged_at: string | null;
  session_id: string;
  table_id: string;
  dining_tables: { label: string } | null;
}

export interface StaffMenuItem {
  id: string;
  name: string;
  name_bn: string | null;
  is_available: boolean;
  sort: number;
  category_id: string;
  menu_categories: { name: string; name_bn: string | null; sort: number } | null;
}
