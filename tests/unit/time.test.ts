import { describe, expect, it } from "vitest";

import { formatAge, formatClock, formatElapsed, timerTone } from "@/lib/time";

describe("time helpers (Asia/Dhaka)", () => {
  it("shows clock time in Dhaka regardless of the machine time zone", () => {
    // 13:42 UTC = 19:42 in Dhaka (UTC+6)
    expect(formatClock("2026-11-19T13:42:00Z", "en")).toBe("7:42 PM");
    expect(formatClock("2026-11-19T13:42:00Z", "bn")).toMatch(/^৭:৪২/);
  });

  it("formats elapsed timers", () => {
    expect(formatElapsed(42_000, "en")).toBe("0:42");
    expect(formatElapsed(12 * 60_000 + 5_000, "en")).toBe("12:05");
    expect(formatElapsed(3_725_000, "en")).toBe("1:02:05");
    expect(formatElapsed(-5_000, "en")).toBe("0:00");
    expect(formatElapsed(102_000, "bn")).toBe("১:৪২");
  });

  it("formats relative ages", () => {
    const now = "2026-11-19T12:00:00Z";
    expect(formatAge("2026-11-19T11:59:30Z", now, "en")).toBe("now");
    expect(formatAge("2026-11-19T11:58:00Z", now, "en")).toBe("2 min. ago");
    expect(formatAge("2026-11-19T10:00:00Z", now, "en")).toBe("2 hr. ago");
  });

  it("bands timers into ok / warn / late", () => {
    expect(timerTone(9 * 60_000)).toBe("ok");
    expect(timerTone(10 * 60_000)).toBe("warn");
    expect(timerTone(19 * 60_000 + 59_000)).toBe("warn");
    expect(timerTone(20 * 60_000)).toBe("late");
    expect(timerTone(3 * 60_000, 2, 5)).toBe("warn");
  });
});
