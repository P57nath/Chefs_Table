import type { OrderStatus } from "@/lib/status";

export interface FloorOrder {
  id: string;
  order_no: number;
  status: OrderStatus;
  placed_at: string;
  confirmed_at: string | null;
  sent_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  subtotal_minor: number;
  item_count: number;
}

export interface FloorRequest {
  id: string;
  type: "call_waiter" | "request_bill" | "water" | "cutlery" | "other";
  status: "open" | "acknowledged" | "resolved";
  note: string | null;
  created_at: string;
}

export interface FloorBill {
  subtotal_minor: number;
  service_charge_minor: number;
  vat_minor: number;
  total_minor: number;
  paid_minor: number;
  due_minor: number;
  unconfirmed_orders: number;
}

export interface FloorSession {
  id: string;
  status: "open" | "billing" | "closed";
  guest_count: number;
  opened_at: string;
  orders: FloorOrder[];
  open_requests: FloorRequest[];
  /** Online payments waiting for a manager (risk / overpayment). */
  pending_review: number;
  bill: FloorBill;
}

/** One row of floor_live(). Positions are floor-plan units (≈ metres). */
export interface FloorTable {
  table_id: string;
  label: string;
  seats: number;
  shape: "round" | "square" | "rect";
  pos_x: number;
  pos_y: number;
  rotation: number;
  zone_id: string | null;
  session: FloorSession | null;
}

export interface Zone {
  id: string;
  name: string;
  sort: number;
}
