import { describe, expect, it } from "vitest";

import {
  etaFor,
  focusOrder,
  maxPrepMinutes,
  statusChanges,
  timeline,
} from "@/features/guest/tracker/tracker-model";
import type { GuestOrder, GuestOrderItem } from "@/features/guest/tracker/types";

const item = (prep: number | null, voided = false): GuestOrderItem => ({
  id: Math.random().toString(36),
  name_snapshot: "x",
  quantity: 1,
  modifiers: [],
  note: null,
  is_voided: voided,
  line_total_minor: 100,
  menu_items: prep === null ? null : { name_bn: null, prep_minutes: prep },
});

function order(partial: Partial<GuestOrder> = {}): GuestOrder {
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
    cancelled_at: null,
    cancel_reason: null,
    customer_note: null,
    subtotal_minor: 100,
    order_items: [item(10), item(25), item(40, true)],
    ...partial,
  };
}

const T = (iso: string) => new Date(iso).getTime();

describe("ETA", () => {
  it("uses the longest non-voided prep time", () => {
    expect(maxPrepMinutes(order())).toBe(25);
    expect(maxPrepMinutes(order({ order_items: [item(null)] }))).toBe(15);
  });

  it("shows full prep time before the kitchen has it", () => {
    expect(etaFor(order(), T("2026-11-19T12:05:00Z"))).toEqual({ kind: "minutes", minutes: 25 });
  });

  it("counts down from sent_at, then 'soon', then 'late'", () => {
    const o = order({ status: "preparing", sent_at: "2026-11-19T12:00:00Z" });
    expect(etaFor(o, T("2026-11-19T12:10:00Z"))).toEqual({ kind: "minutes", minutes: 15 });
    expect(etaFor(o, T("2026-11-19T12:24:00Z"))).toEqual({ kind: "soon" });
    expect(etaFor(o, T("2026-11-19T12:28:00Z"))).toEqual({ kind: "soon" });
    expect(etaFor(o, T("2026-11-19T12:31:00Z"))).toEqual({ kind: "late" });
  });

  it("has no ETA once ready, served or cancelled", () => {
    for (const status of ["ready", "served", "cancelled"] as const) {
      expect(etaFor(order({ status }), Date.now())).toBeNull();
    }
  });
});

describe("focus order & timeline", () => {
  it("follows the newest active order, then the newest served", () => {
    const a = order({ id: "a", status: "served", placed_at: "2026-11-19T12:00:00Z" });
    const b = order({ id: "b", status: "preparing", placed_at: "2026-11-19T12:10:00Z" });
    const c = order({ id: "c", status: "cancelled", placed_at: "2026-11-19T12:20:00Z" });
    expect(focusOrder([a, b, c])?.id).toBe("b");
    expect(focusOrder([a, c])?.id).toBe("a");
    expect(focusOrder([c])?.id).toBe("c");
    expect(focusOrder([])).toBeNull();
  });

  it("marks timeline steps done / current / todo", () => {
    const steps = timeline(order({ status: "preparing", confirmed_at: "x", sent_at: "y" }));
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(timeline(order({ status: "served" })).every((s) => s.state === "done")).toBe(true);
  });

  it("detects status changes between snapshots (not new orders)", () => {
    const prev = new Map([["o1", "placed" as const]]);
    const next = [order({ status: "confirmed" }), order({ id: "o2" })];
    expect(statusChanges(prev, next).map((o) => o.id)).toEqual(["o1"]);
  });
});
