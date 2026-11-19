import { describe, expect, it } from "vitest";

import { canUse, FLOOR_ROLES, homeFor, isProtectedPath, safeNext } from "@/features/auth/roles";

describe("post-login redirect safety", () => {
  it.each([
    ["/staff/orders", "/staff/orders"],
    ["/staff?tab=new", "/staff?tab=new"],
    ["/admin/menu", "/admin/menu"],
  ])("accepts %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/staff",
    "//evil.example/staff",
    "/\\evil.example",
    "/t/demo-table-01",
    "/staffer",
    "staff",
    "/staff\r\nSet-Cookie: x=1",
    null,
    "",
  ])("rejects %s", (input) => {
    expect(safeNext(input)).toBeNull();
  });
});

describe("roles", () => {
  it("protects only staff areas", () => {
    expect(isProtectedPath("/staff")).toBe(true);
    expect(isProtectedPath("/kitchen")).toBe(true);
    expect(isProtectedPath("/admin/qr")).toBe(true);
    expect(isProtectedPath("/t/demo-table-01")).toBe(false);
    expect(isProtectedPath("/staffing")).toBe(false);
  });

  it("matches the permission table", () => {
    expect(canUse("waiter", FLOOR_ROLES)).toBe(true);
    expect(canUse("kitchen", FLOOR_ROLES)).toBe(false);
    expect(homeFor("kitchen")).toBe("/kitchen");
    expect(homeFor("waiter")).toBe("/staff");
  });
});
