import { describe, expect, it } from "vitest";

import {
  allowedActions,
  diffAlerts,
  groupByColumn,
  isStaleNewOrder,
  liveItemCount,
  snapshotOf,
} from "@/features/staff/board-model";
import type { BoardOrder, StaffRequest } from "@/features/staff/types";

function order(p: Partial<BoardOrder> = {}): BoardOrder {
  return {
    id: "o1",
    order_no: 1,
    status: "placed",
    placed_at: "2026-11-19T12:00:00Z",
    confirmed_at: null,
    sent_at: null,
    preparing_at: null,
    ready_at: null,
    served_at: null,
    customer_note: null,
    subtotal_minor: 1000,
    session_id: "s1",
    table_id: "t1",
    dining_tables: { label: "T4" },
    order_items: [
      {
        id: "i1",
        name_snapshot: "A",
        quantity: 2,
        modifiers: [],
        note: null,
        is_voided: false,
        unit_price_minor: 100,
        line_total_minor: 200,
      },
      {
        id: "i2",
        name_snapshot: "B",
        quantity: 1,
        modifiers: [],
        note: null,
        is_voided: true,
        unit_price_minor: 100,
        line_total_minor: 100,
      },
    ],
    ...p,
  };
}

const request = (id: string, status: StaffRequest["status"] = "open"): StaffRequest => ({
  id,
  type: "call_waiter",
  status,
  note: null,
  created_at: "2026-11-19T12:00:00Z",
  acknowledged_at: null,
  session_id: "s1",
  table_id: "t1",
  dining_tables: { label: "T4" },
});

describe("board columns", () => {
  it("groups statuses and orders urgent work first", () => {
    const cols = groupByColumn([
      order({ id: "late", placed_at: "2026-11-19T12:05:00Z" }),
      order({ id: "early", placed_at: "2026-11-19T12:00:00Z" }),
      order({ id: "cook", status: "preparing", sent_at: "2026-11-19T12:01:00Z" }),
      order({ id: "s1", status: "served", served_at: "2026-11-19T12:10:00Z" }),
      order({ id: "s2", status: "served", served_at: "2026-11-19T12:20:00Z" }),
    ]);
    expect(cols.new.map((o) => o.id)).toEqual(["early", "late"]);
    expect(cols.kitchen.map((o) => o.id)).toEqual(["cook"]);
    expect(cols.served.map((o) => o.id)).toEqual(["s2", "s1"]);
  });

  it("counts only live items and flags stale new orders after 2 min", () => {
    expect(liveItemCount(order())).toBe(2);
    const t = new Date("2026-11-19T12:00:00Z").getTime();
    expect(isStaleNewOrder(order(), t + 119_000)).toBe(false);
    expect(isStaleNewOrder(order(), t + 121_000)).toBe(true);
    expect(isStaleNewOrder(order({ status: "confirmed" }), t + 999_000)).toBe(false);
  });
});

describe("alerts from snapshot diffs", () => {
  it("never alerts on first load", () => {
    expect(diffAlerts(null, [order()], [request("r1")])).toEqual([]);
  });

  it("alerts on new placed orders, newly ready orders and new open requests", () => {
    const prev = snapshotOf([order({ id: "a", status: "preparing" })], [request("r1")]);
    const alerts = diffAlerts(
      prev,
      [order({ id: "a", status: "ready" }), order({ id: "b" })],
      [request("r1"), request("r2")],
    );
    expect(alerts.map((a) => a.kind).sort()).toEqual(["new_order", "ready", "request"]);
  });

  it("does not re-alert unchanged state", () => {
    const orders = [order({ id: "a", status: "ready" })];
    const prev = snapshotOf(orders, []);
    expect(diffAlerts(prev, orders, [])).toEqual([]);
  });
});

describe("role-based actions (mirror of advance_order)", () => {
  it("waiters confirm/send/serve but cannot cancel kitchen orders", () => {
    expect(allowedActions("placed", "waiter")).toMatchObject({
      confirm: true,
      confirmAndSend: true,
      reject: true,
      editLines: true,
    });
    expect(allowedActions("preparing", "waiter").cancelInKitchen).toBe(false);
    expect(allowedActions("ready", "waiter").serve).toBe(true);
  });

  it("kitchen cannot do floor actions; managers can cancel in the kitchen", () => {
    expect(Object.values(allowedActions("placed", "kitchen")).some(Boolean)).toBe(false);
    expect(allowedActions("in_kitchen", "manager").cancelInKitchen).toBe(true);
  });
});
