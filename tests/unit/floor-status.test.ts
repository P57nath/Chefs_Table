import { describe, expect, it } from "vitest";

import { occupancy, STATE_PRIORITY, tableStatus } from "@/features/floor/status";
import type { FloorOrder, FloorRequest, FloorSession, FloorTable } from "@/features/floor/types";

const NOW = new Date("2026-11-19T12:10:00Z").getTime();

const order = (status: FloorOrder["status"], extra: Partial<FloorOrder> = {}): FloorOrder => ({
  id: Math.random().toString(36),
  order_no: 1,
  status,
  placed_at: "2026-11-19T12:00:00Z",
  confirmed_at: "2026-11-19T12:01:00Z",
  sent_at: "2026-11-19T12:02:00Z",
  ready_at: "2026-11-19T12:05:00Z",
  served_at: "2026-11-19T12:06:00Z",
  subtotal_minor: 1000,
  item_count: 2,
  ...extra,
});

const request = (
  type: FloorRequest["type"],
  status: FloorRequest["status"] = "open",
): FloorRequest => ({
  id: Math.random().toString(36),
  type,
  status,
  note: null,
  created_at: "2026-11-19T12:03:00Z",
});

function table(session: Partial<FloorSession> | null): FloorTable {
  return {
    table_id: "t",
    label: "T4",
    seats: 4,
    shape: "round",
    pos_x: 1,
    pos_y: 1,
    rotation: 0,
    zone_id: null,
    session:
      session === null
        ? null
        : {
            id: "s",
            status: "open",
            guest_count: 2,
            opened_at: "2026-11-19T11:50:00Z",
            pending_review: 0,
            orders: [],
            open_requests: [],
            bill: {
              subtotal_minor: 0,
              service_charge_minor: 0,
              vat_minor: 0,
              total_minor: 0,
              paid_minor: 0,
              due_minor: 0,
              unconfirmed_orders: 0,
            },
            ...session,
          },
  };
}

const unpaid = {
  subtotal_minor: 1000,
  service_charge_minor: 0,
  vat_minor: 0,
  total_minor: 1000,
  paid_minor: 0,
  due_minor: 1000,
  unconfirmed_orders: 0,
};

describe("table state priority", () => {
  it("free without a session, seated with an empty one", () => {
    expect(tableStatus(table(null), NOW).state).toBe("free");
    expect(tableStatus(table({}), NOW)).toMatchObject({
      state: "seated",
      since: "2026-11-19T11:50:00Z",
    });
  });

  it("call waiter beats everything (acknowledged calls don't)", () => {
    const t = table({
      orders: [order("placed"), order("ready")],
      open_requests: [request("water")],
    });
    expect(tableStatus(t, NOW).state).toBe("call_waiter");
    const ack = table({
      orders: [order("served")],
      open_requests: [request("call_waiter", "acknowledged")],
      bill: unpaid,
    });
    expect(tableStatus(ack, NOW).state).toBe("eating");
  });

  it("new order > ready > bill > cooking > confirmed > eating", () => {
    expect(tableStatus(table({ orders: [order("ready"), order("placed")] }), NOW).state).toBe(
      "new_order",
    );
    expect(
      tableStatus(table({ orders: [order("ready"), order("preparing")], bill: unpaid }), NOW).state,
    ).toBe("ready");
    expect(
      tableStatus(
        table({
          orders: [order("preparing")],
          open_requests: [request("request_bill")],
          bill: unpaid,
        }),
        NOW,
      ).state,
    ).toBe("bill_requested");
    expect(
      tableStatus(table({ orders: [order("in_kitchen"), order("confirmed")], bill: unpaid }), NOW)
        .state,
    ).toBe("cooking");
    expect(
      tableStatus(table({ orders: [order("confirmed"), order("served")], bill: unpaid }), NOW)
        .state,
    ).toBe("confirmed");
    expect(tableStatus(table({ orders: [order("served")], bill: unpaid }), NOW).state).toBe(
      "eating",
    );
  });

  it("billing session status counts as bill requested", () => {
    expect(
      tableStatus(table({ status: "billing", orders: [order("served")], bill: unpaid }), NOW).state,
    ).toBe("bill_requested");
  });

  it("paid when total > 0 and nothing is due or unconfirmed", () => {
    const paidBill = { ...unpaid, paid_minor: 1000, due_minor: 0 };
    expect(tableStatus(table({ orders: [order("served")], bill: paidBill }), NOW).state).toBe(
      "paid",
    );
    expect(
      tableStatus(
        table({
          orders: [order("served"), order("placed")],
          bill: { ...paidBill, unconfirmed_orders: 1 },
        }),
        NOW,
      ).state,
    ).toBe("new_order");
  });

  it("flags new orders older than 2 minutes and counts items", () => {
    const s = tableStatus(
      table({
        orders: [
          order("placed", { placed_at: "2026-11-19T12:07:00Z" }),
          order("served", { item_count: 3 }),
        ],
      }),
      NOW,
    );
    expect(s.overdue).toBe(true);
    expect(s.counts).toMatchObject({ newOrders: 1, items: 5 });
    expect(
      tableStatus(table({ orders: [order("placed", { placed_at: "2026-11-19T12:09:00Z" })] }), NOW)
        .overdue,
    ).toBe(false);
  });

  it("priority index matches the list", () => {
    expect(tableStatus(table(null), NOW).priority).toBe(STATE_PRIORITY.length - 1);
    expect(occupancy([table(null), table({})])).toEqual({ occupied: 1, total: 2 });
  });
});
