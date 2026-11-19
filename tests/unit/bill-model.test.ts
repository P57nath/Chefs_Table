import {
  checkCustomAmount,
  isSettled,
  splitBillLines,
  type BillData,
  type GuestPayment,
} from "@/features/guest/bill/bill-model";
import { resultView } from "@/features/guest/bill/result-model";
import type { GuestOrder, GuestOrderItem } from "@/features/guest/tracker/types";

const item = (id: string, voided = false): GuestOrderItem => ({
  id,
  name_snapshot: id,
  quantity: 1,
  modifiers: [],
  note: null,
  is_voided: voided,
  line_total_minor: 10000,
  menu_items: null,
});
const order = (status: GuestOrder["status"], items: GuestOrderItem[]): GuestOrder => ({
  id: status,
  order_no: 1,
  status,
  placed_at: "2026-11-19T12:00:00Z",
  confirmed_at: null,
  sent_at: null,
  preparing_at: null,
  ready_at: null,
  served_at: null,
  cancelled_at: null,
  cancel_reason: null,
  customer_note: null,
  subtotal_minor: 0,
  order_items: items,
});

describe("splitBillLines", () => {
  it("bills confirmed-or-later lines, lists placed ones separately, drops cancelled/voided", () => {
    const { billed, waiting } = splitBillLines([
      order("served", [item("a"), item("b", true)]),
      order("in_kitchen", [item("c")]),
      order("placed", [item("d")]),
      order("cancelled", [item("e")]),
    ]);
    expect(billed.map((l) => l.id)).toEqual(["a", "c"]);
    expect(waiting.map((l) => l.id)).toEqual(["d"]);
  });
});

describe("checkCustomAmount", () => {
  it("accepts amounts between ৳10 and the due", () => {
    expect(checkCustomAmount("500", 100000)).toEqual({ ok: true, minor: 50000 });
    expect(checkCustomAmount("১০০০", 100000)).toEqual({ ok: true, minor: 100000 });
  });
  it.each([
    ["", "empty"],
    ["abc", "invalid"],
    ["0", "invalid"],
    ["9.99", "tooSmall"],
    ["1000.01", "tooLarge"],
  ])("%s → %s", (text, reason) => {
    expect(checkCustomAmount(text, 100000)).toEqual({ ok: false, reason });
  });
});

const bill = (patch: Partial<BillData>): BillData => ({
  subtotal_minor: 0,
  service_charge_bps: 0,
  service_charge_minor: 0,
  vat_bps: 0,
  vat_minor: 0,
  total_minor: 10000,
  paid_minor: 0,
  due_minor: 10000,
  unconfirmed_orders: 0,
  currency: "BDT",
  ...patch,
});

describe("isSettled", () => {
  it("needs a non-empty bill, nothing due and nothing unconfirmed", () => {
    expect(isSettled(bill({ due_minor: 0, paid_minor: 10000 }))).toBe(true);
    expect(isSettled(bill({ due_minor: 0, total_minor: 0 }))).toBe(false);
    expect(isSettled(bill({ due_minor: 0, unconfirmed_orders: 1 }))).toBe(false);
    expect(isSettled(bill({}))).toBe(false);
  });
});

const pay = (status: GuestPayment["status"]): GuestPayment => ({
  id: "p",
  tran_id: "ES-1",
  method: "sslcommerz",
  channel: "bkash",
  amount_minor: 10000,
  status,
  created_at: "2026-11-19T12:00:00Z",
  paid_at: null,
});

describe("resultView", () => {
  it("trusts the database over the redirect hint", () => {
    expect(resultView("fail", pay("paid"), false)).toBe("paid");
    expect(resultView("success", pay("failed"), false)).toBe("failed");
    expect(resultView("success", pay("pending_review"), false)).toBe("reviewing");
  });
  it("waits for the IPN on success, then says it's still confirming", () => {
    expect(resultView("success", pay("initiated"), false)).toBe("confirming");
    expect(resultView("success", pay("initiated"), true)).toBe("confirmingLong");
    expect(resultView("cancel", pay("initiated"), false)).toBe("cancelled");
  });
  it("unknown transaction", () => {
    expect(resultView("success", null, false)).toBe("notFound");
  });
});
