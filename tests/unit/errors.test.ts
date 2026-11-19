import { describe, expect, it } from "vitest";

import { AppErrorException, asAppError, toAppError } from "@/lib/errors";

describe("toAppError", () => {
  it("maps ITEM_UNAVAILABLE with the item name", () => {
    expect(toAppError({ code: "P0001", message: "ITEM_UNAVAILABLE:Firni" })).toMatchObject({
      key: "itemUnavailable",
      params: { name: "Firni" },
      network: false,
    });
  });

  it("keeps colons inside names", () => {
    expect(toAppError({ message: "ITEM_UNAVAILABLE:Tea: Masala" }).params).toEqual({
      name: "Tea: Masala",
    });
  });

  it("maps modifier rule violations with the group", () => {
    expect(toAppError({ message: "MODIFIER_RULES:Patty" })).toMatchObject({
      key: "modifierRules",
      params: { group: "Patty" },
    });
  });

  it("maps a lost race between staff to 'already updated'", () => {
    expect(toAppError({ message: "INVALID_TRANSITION:confirmed->confirmed" }).key).toBe(
      "alreadyUpdated",
    );
  });

  it.each([
    ["SESSION_CLOSED", "sessionClosed"],
    ["TOO_MANY_PENDING_ORDERS", "tooManyPending"],
    ["FORBIDDEN", "forbidden"],
    ["UNPAID_BALANCE", "unpaidBalance"],
    ["AMOUNT_EXCEEDS_DUE", "amountExceedsDue"],
    ["TABLE_NOT_FOUND", "tableNotFound"],
    ["NOT_A_GUEST", "notAGuest"],
    ["ALREADY_CONFIRMED", "alreadyConfirmed"],
  ])("maps %s", (message, key) => {
    expect(toAppError({ message }).key).toBe(key);
  });

  it("flags network failures as unknown-outcome", () => {
    expect(toAppError(new TypeError("Failed to fetch"))).toMatchObject({
      key: "network",
      network: true,
    });
    expect(toAppError({ message: "FetchError: fetch failed" }).network).toBe(true);
  });

  it("falls back to unknown", () => {
    expect(toAppError({ message: "boom" }).key).toBe("unknown");
    expect(toAppError(undefined).key).toBe("unknown");
  });

  it("unwraps AppErrorException", () => {
    const e = new AppErrorException(toAppError({ message: "SESSION_CLOSED" }));
    expect(asAppError(e).key).toBe("sessionClosed");
  });
});
