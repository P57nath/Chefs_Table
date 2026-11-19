import type { GuestOrder, GuestOrderItem } from "@/features/guest/tracker/types";
import { toMinor } from "@/lib/money";
import { MIN_ONLINE_PAYMENT_MINOR } from "@/lib/payments/types";

export interface BillData {
  subtotal_minor: number;
  service_charge_bps: number;
  service_charge_minor: number;
  vat_bps: number;
  vat_minor: number;
  total_minor: number;
  paid_minor: number;
  due_minor: number;
  unconfirmed_orders: number;
  currency: string;
}

export type GuestPaymentStatus =
  "initiated" | "pending_review" | "paid" | "failed" | "cancelled" | "refunded";

export interface GuestPayment {
  id: string;
  tran_id: string | null;
  method: "cash" | "sslcommerz";
  channel: string | null;
  amount_minor: number;
  status: GuestPaymentStatus;
  created_at: string;
  paid_at: string | null;
}

/** Display rows only; the money itself always comes from session_bill(). */
export interface BillLine {
  id: string;
  item: GuestOrderItem;
}

/**
 * Lines on the bill = items of confirmed-or-later orders (not cancelled, not
 * voided). Orders still `placed` are listed separately, "not on the bill yet".
 */
export function splitBillLines(orders: GuestOrder[]): { billed: BillLine[]; waiting: BillLine[] } {
  const billed: BillLine[] = [];
  const waiting: BillLine[] = [];
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const item of o.order_items) {
      if (item.is_voided) continue;
      (o.status === "placed" ? waiting : billed).push({ id: item.id, item });
    }
  }
  return { billed, waiting };
}

export type AmountCheck =
  | { ok: true; minor: number }
  | { ok: false; reason: "empty" | "invalid" | "tooSmall" | "tooLarge" };

/** Custom split amount: a valid taka amount between the gateway minimum and the due. */
export function checkCustomAmount(text: string, dueMinor: number): AmountCheck {
  if (text.trim() === "") return { ok: false, reason: "empty" };
  const minor = toMinor(text);
  if (minor === null || minor <= 0) return { ok: false, reason: "invalid" };
  if (minor > dueMinor) return { ok: false, reason: "tooLarge" };
  if (minor < MIN_ONLINE_PAYMENT_MINOR) return { ok: false, reason: "tooSmall" };
  return { ok: true, minor };
}

/** Online payment still being processed by the gateway / staff. */
export function inFlight(payments: GuestPayment[]): GuestPayment[] {
  return payments.filter((p) => p.status === "pending_review");
}

export function isSettled(bill: BillData): boolean {
  return bill.total_minor > 0 && bill.due_minor === 0 && bill.unconfirmed_orders === 0;
}
