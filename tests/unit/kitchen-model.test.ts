import { describe, expect, it } from "vitest";

import {
  allDay,
  groupKitchen,
  newTickets,
  type KitchenItem,
  type KitchenOrder,
} from "@/features/kitchen/kitchen-model";

const item = (name: string, quantity: number, extra: Partial<KitchenItem> = {}): KitchenItem => ({
  id: `${name}-${quantity}-${Math.random()}`,
  name_snapshot: name,
  quantity,
  modifiers: [],
  note: null,
  is_voided: false,
  is_done: false,
  ...extra,
});

function ticket(p: Partial<KitchenOrder> = {}): KitchenOrder {
  return {
    id: "o1",
    order_no: 1,
    status: "in_kitchen",
    customer_note: null,
    sent_at: "2026-11-19T12:00:00Z",
    preparing_at: null,
    ready_at: null,
    placed_at: "2026-11-19T11:58:00Z",
    dining_tables: { label: "T1" },
    order_items: [item("Firni", 2)],
    ...p,
  };
}

const NOW = new Date("2026-11-19T12:30:00Z").getTime();

describe("kitchen columns", () => {
  it("splits by status, oldest first, and keeps ready tickets for 10 minutes", () => {
    const cols = groupKitchen(
      [
        ticket({ id: "late", sent_at: "2026-11-19T12:10:00Z" }),
        ticket({ id: "early", sent_at: "2026-11-19T12:01:00Z" }),
        ticket({ id: "cooking", status: "preparing" }),
        ticket({ id: "fresh", status: "ready", ready_at: "2026-11-19T12:25:00Z" }),
        ticket({ id: "stale", status: "ready", ready_at: "2026-11-19T12:15:00Z" }),
        ticket({ id: "served", status: "served" }),
      ],
      NOW,
    );
    expect(cols.new.map((o) => o.id)).toEqual(["early", "late"]);
    expect(cols.preparing.map((o) => o.id)).toEqual(["cooking"]);
    expect(cols.ready.map((o) => o.id)).toEqual(["fresh"]);
  });
});

describe("all-day panel", () => {
  it("sums what is still to cook across open tickets", () => {
    const totals = allDay([
      ticket({ order_items: [item("Firni", 2), item("Tehari", 1)] }),
      ticket({
        status: "preparing",
        order_items: [item("Firni", 3), item("Tehari", 1, { is_done: true })],
      }),
      ticket({ order_items: [item("Lassi", 4, { is_voided: true })] }),
      ticket({ status: "ready", order_items: [item("Firni", 9)] }),
    ]);
    expect(totals).toEqual([
      { name: "Firni", quantity: 5 },
      { name: "Tehari", quantity: 1 },
    ]);
  });
});

describe("new ticket detection", () => {
  it("chimes only for tickets that newly reached the kitchen", () => {
    const a = ticket({ id: "a" });
    expect(newTickets(null, [a])).toEqual([]);
    expect(newTickets(new Set(["a"]), [a, ticket({ id: "b" })]).map((o) => o.id)).toEqual(["b"]);
    expect(newTickets(new Set(["a"]), [ticket({ id: "c", status: "preparing" })])).toEqual([]);
  });
});
