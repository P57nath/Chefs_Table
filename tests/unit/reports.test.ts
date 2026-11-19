import {
  delta,
  formatDuration,
  hours24,
  niceTicks,
  normaliseReport,
  paymentSplit,
  reportRange,
} from "@/features/admin/reports/model";
import { formatMoneyCompact } from "@/lib/money";

const NOW = new Date("2026-11-19T10:00:00Z"); // 16:00 in Dhaka

describe("reportRange", () => {
  it("today vs yesterday by default", () => {
    const r = reportRange({}, NOW);
    expect(r.preset).toBe("today");
    expect([r.current.from, r.current.to, r.days]).toEqual(["2026-11-19", "2026-11-19", 1]);
    expect([r.previous.from, r.previous.to]).toEqual(["2026-11-18", "2026-11-18"]);
    expect(r.previous.end.getTime()).toBe(r.current.start.getTime());
  });
  it("7 days compares with the 7 days before", () => {
    const r = reportRange({ range: "7d" }, NOW);
    expect([r.current.from, r.current.to, r.days]).toEqual(["2026-11-13", "2026-11-19", 7]);
    expect([r.previous.from, r.previous.to]).toEqual(["2026-11-06", "2026-11-12"]);
  });
  it("custom needs both valid days, otherwise falls back to today", () => {
    expect(reportRange({ range: "custom", from: "2026-11-01", to: "2026-11-10" }, NOW).days).toBe(
      10,
    );
    expect(reportRange({ range: "custom", from: "bad" }, NOW).preset).toBe("today");
  });
});

describe("report helpers", () => {
  it("delta is null without a baseline", () => {
    expect(delta(150, 100)).toBe(50);
    expect(delta(50, 100)).toBe(-50);
    expect(delta(10, 0)).toBeNull();
  });
  it("zero-fills 24 hours", () => {
    const h = hours24([{ hour: 13, orders: 4 }]);
    expect(h).toHaveLength(24);
    expect(h[13]).toEqual({ hour: 13, orders: 4 });
    expect(h[0]?.orders).toBe(0);
  });
  it("payment shares add up to exactly 100, largest first", () => {
    const s = paymentSplit({ cash: 1, card: 1, bkash: 1, nagad: 0 });
    expect(s.map((r) => r.share).reduce((a, b) => a + b, 0)).toBe(100);
    expect(s).toHaveLength(3);
    expect(paymentSplit({})).toEqual([]);
    expect(paymentSplit({ bkash: 300, cash: 100 })[0]).toEqual({
      key: "bkash",
      amount: 300,
      share: 75,
    });
  });
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(200)).toBe("3m 20s");
    expect(formatDuration(3900)).toBe("1h 05m");
  });
  it("makes clean integer ticks", () => {
    expect(niceTicks(23)).toEqual([0, 10, 20, 30]);
    expect(niceTicks(2)).toEqual([0, 1, 2]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
  it("normalises numeric strings from jsonb", () => {
    const r = normaliseReport({
      revenue_minor: "1200",
      orders: 3,
      by_method: { cash: "1200" },
      avg_rating: "4.50",
    });
    expect(r.revenue_minor).toBe(1200);
    expect(r.by_method.cash).toBe(1200);
    expect(r.avg_rating).toBe(4.5);
    expect(r.top_items).toEqual([]);
  });
  it("compact money for axes", () => {
    expect(formatMoneyCompact(1250000, "en")).toBe("৳12.5K");
    expect(formatMoneyCompact(0, "en")).toBe("৳0");
  });
});
