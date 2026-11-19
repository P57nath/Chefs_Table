import { describe, expect, it } from "vitest";

import { toBanglaDigits } from "@/lib/digits";
import { formatBps, formatMoney, toDecimalString, toMinor } from "@/lib/money";

describe("toDecimalString", () => {
  it("is exact for gateways", () => {
    expect(toDecimalString(78343)).toBe("783.43");
    expect(toDecimalString(5)).toBe("0.05");
    expect(toDecimalString(100000)).toBe("1000.00");
    expect(toDecimalString(-150)).toBe("-1.50");
  });
});

describe("formatMoney", () => {
  it("formats whole taka without decimals by default", () => {
    expect(formatMoney(123400, "en")).toBe("৳1,234");
    expect(formatMoney(42000, "en")).toBe("৳420");
    expect(formatMoney(0, "en")).toBe("৳0");
  });

  it("uses Bangla digits in bn", () => {
    expect(formatMoney(123400, "bn")).toBe("৳১,২৩৪");
    expect(formatMoney(123450, "bn")).toBe("৳১,২৩৪.৫০");
  });

  it("shows poisha only when present (auto) and respects options", () => {
    expect(formatMoney(78343, "en")).toBe("৳783.43");
    expect(formatMoney(78300, "en", { decimals: "always" })).toBe("৳783.00");
    expect(formatMoney(78343, "en", { decimals: "never" })).toBe("৳783");
    expect(formatMoney(78300, "en", { symbol: false })).toBe("783");
    expect(formatMoney(5, "en")).toBe("৳0.05");
  });

  it("handles negatives and large amounts exactly", () => {
    expect(formatMoney(-1050, "en")).toBe("-৳10.50");
    expect(formatMoney(999_999_999_99, "en")).toBe("৳999,999,999.99");
  });

  it("refuses floats", () => {
    expect(() => formatMoney(10.5, "en")).toThrow(TypeError);
  });
});

describe("toMinor", () => {
  it.each([
    ["420", 42000],
    ["1,234.5", 123450],
    ["৳ 1,234.56", 123456],
    ["১২৩", 12300],
    ["Tk 99.9", 9990],
    ["0.05", 5],
  ])("parses %s → %i", (input, expected) => {
    expect(toMinor(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-5", "1e3", "12.3.4"])("rejects %s", (input) => {
    expect(toMinor(input)).toBeNull();
  });

  it("round-trips with formatMoney without float drift", () => {
    for (const minor of [1, 10, 99, 101, 12345, 1999999]) {
      expect(toMinor(formatMoney(minor, "en", { decimals: "always" }))).toBe(minor);
    }
  });
});

describe("digits & percentages", () => {
  it("converts ASCII digits only", () => {
    expect(toBanglaDigits("T4 · 12:05")).toBe("T৪ · ১২:০৫");
  });

  it("formats basis points", () => {
    expect(formatBps(750, "en")).toBe("7.5%");
    expect(formatBps(1000, "en")).toBe("10%");
    expect(formatBps(1525, "bn")).toBe("১৫.২৫%");
  });
});
