import { describe, expect, it } from "vitest";

import {
  DEMO_STAFF,
  demoStaffEnvSchema,
  isLocalUrl,
  parseCliArgs,
  planDemoStaff,
  selectStaff,
  staffMemberRow,
} from "../../scripts/demo-staff";

describe("demo staff plan", () => {
  it("covers the six accounts from the build plan with unique emails", () => {
    expect(DEMO_STAFF.map((s) => s.email)).toEqual([
      "owner@demo.local",
      "manager@demo.local",
      "waiter@demo.local",
      "waiter2@demo.local",
      "kitchen@demo.local",
      "cashier@demo.local",
    ]);
  });

  it("reuses existing users (case-insensitive) and creates the rest", () => {
    const plan = planDemoStaff(DEMO_STAFF, [
      { id: "u-owner", email: "Owner@Demo.Local" },
      { id: "anon", email: null },
    ]);
    expect(plan.find((p) => p.member.role === "owner")?.existingUserId).toBe("u-owner");
    expect(plan.filter((p) => p.existingUserId === null)).toHaveLength(5);
  });

  it("is idempotent: a second run finds every user", () => {
    const users = DEMO_STAFF.map((s, i) => ({ id: `u${i}`, email: s.email }));
    expect(planDemoStaff(DEMO_STAFF, users).every((p) => p.existingUserId)).toBe(true);
  });

  it("builds an active staff_members row", () => {
    expect(staffMemberRow(DEMO_STAFF[0]!, "uid", "rid")).toEqual({
      user_id: "uid",
      restaurant_id: "rid",
      role: "owner",
      display_name: "Farhana Rahman",
      avatar_color: "#F5A524",
      is_active: true,
    });
  });
});

describe("CLI safety", () => {
  it("parses --only and --allow-remote", () => {
    expect(parseCliArgs(["--only", "owner,manager", "--allow-remote"])).toEqual({
      only: ["owner", "manager"],
      allowRemote: true,
    });
    expect(selectStaff(DEMO_STAFF, ["owner"])).toHaveLength(1);
  });

  it("rejects unknown roles and arguments", () => {
    expect(() => parseCliArgs(["--only", "chef"])).toThrow(/Unknown role/);
    expect(() => parseCliArgs(["--force"])).toThrow(/Unknown argument/);
  });

  it("only treats loopback hosts as local", () => {
    expect(isLocalUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalUrl("http://localhost:54321")).toBe(true);
    expect(isLocalUrl("https://abc.supabase.co")).toBe(false);
  });

  it("requires a reasonable demo password", () => {
    const base = {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SECRET_KEY: "sb_secret_x",
      DEMO_RESTAURANT_ID: "00000000-0000-4000-8000-000000000001",
    };
    expect(demoStaffEnvSchema.safeParse({ ...base, DEMO_STAFF_PASSWORD: "short" }).success).toBe(
      false,
    );
    expect(
      demoStaffEnvSchema.safeParse({ ...base, DEMO_STAFF_PASSWORD: "ChangeMe!2026" }).success,
    ).toBe(true);
  });
});
