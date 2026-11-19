import { accentCss, accentKey } from "@/config/accents";
import { csvCell, toCsv } from "@/features/admin/csv";
import { dhakaDay, dhakaDayStart, parseDayRange } from "@/features/admin/date-range";
import {
  changedPlacements,
  clampPos,
  keyToChange,
  moveBy,
  rotateBy,
  snap,
} from "@/features/admin/floor/layout-model";
import { cropRect, outputSize, panDelta } from "@/features/admin/image/crop";
import { itemSchema, percentText, priceText, settingsSchema } from "@/features/admin/schemas";
import {
  assignableRoles,
  canManageStaff,
  removesLastOwner,
  temporaryPassword,
} from "@/features/admin/staff/permissions";

describe("image crop math", () => {
  it("takes the largest 4:3 area, centred", () => {
    expect(cropRect(1600, 1600, 4 / 3, 1, 0, 0)).toEqual({ sx: 0, sy: 200, sw: 1600, sh: 1200 });
  });
  it("zoom shrinks the crop and pan moves it within the free space", () => {
    const r = cropRect(1200, 900, 4 / 3, 2, 1, -1);
    expect(r).toEqual({ sx: 600, sy: 0, sw: 600, sh: 450 });
  });
  it("clamps zoom and pan", () => {
    expect(cropRect(1000, 1000, 1, 10, 5, -5)).toEqual(cropRect(1000, 1000, 1, 4, 1, -1));
  });
  it("never upscales the output", () => {
    expect(outputSize({ sx: 0, sy: 0, sw: 800, sh: 600 }, 1200, 4 / 3)).toEqual({
      width: 800,
      height: 600,
    });
    expect(outputSize({ sx: 0, sy: 0, sw: 4000, sh: 3000 }, 1200, 4 / 3)).toEqual({
      width: 1200,
      height: 900,
    });
  });
  it("dragging right pans left (image follows the finger)", () => {
    expect(panDelta(10, 320, 400, 800)).toBeLessThan(0);
    expect(panDelta(10, 320, 0, 800)).toBe(0);
  });
});

describe("floor layout model", () => {
  it("snaps to the 0.5 m grid and clamps to the room", () => {
    expect(snap(3.26)).toBe(3.5);
    expect(clampPos(-2)).toBe(0);
    expect(clampPos(99)).toBe(60);
  });
  it("keeps rotation in 0–359", () => {
    expect(rotateBy(350, 15)).toBe(5);
    expect(rotateBy(0, -15)).toBe(345);
  });
  it("maps keys to moves and rotations", () => {
    expect(keyToChange("ArrowRight", false)).toEqual({ dx: 0.5, dy: 0, dr: 0 });
    expect(keyToChange("ArrowUp", true)).toEqual({ dx: 0, dy: -2, dr: 0 });
    expect(keyToChange("R", false)).toEqual({ dx: 0, dy: 0, dr: -15 });
    expect(keyToChange("x", false)).toBeNull();
    expect(moveBy({ x: 0, y: 1, rotation: 0 }, -0.5, 0.5)).toEqual({ x: 0, y: 1.5, rotation: 0 });
  });
  it("sends only changed tables", () => {
    const saved = { a: { x: 1, y: 1, rotation: 0 }, b: { x: 2, y: 2, rotation: 0 } };
    expect(changedPlacements(saved, { ...saved, b: { x: 2, y: 2, rotation: 90 } })).toEqual([
      { id: "b", x: 2, y: 2, rotation: 90 },
    ]);
  });
});

describe("staff permissions (spec §2)", () => {
  it("owners manage everyone", () => {
    expect(canManageStaff("owner", "owner", "manager")).toBe(true);
    expect(assignableRoles("owner")).toContain("owner");
  });
  it("managers manage everyone except owners and can't create owners", () => {
    expect(canManageStaff("manager", "waiter", "manager")).toBe(true);
    expect(canManageStaff("manager", "owner")).toBe(false);
    expect(canManageStaff("manager", "waiter", "owner")).toBe(false);
    expect(assignableRoles("manager")).not.toContain("owner");
  });
  it("others manage nobody", () => {
    expect(canManageStaff("waiter", "kitchen")).toBe(false);
  });
  it("never leaves the restaurant without an active owner", () => {
    const team = [
      { userId: "o", role: "owner" as const, isActive: true },
      { userId: "m", role: "manager" as const, isActive: true },
    ];
    expect(removesLastOwner(team, "o", { isActive: false })).toBe(true);
    expect(removesLastOwner(team, "o", { role: "manager" })).toBe(true);
    expect(removesLastOwner(team, "m", { role: "owner" })).toBe(false);
  });
  it("temporary passwords meet the auth policy", () => {
    for (let i = 0; i < 20; i++) {
      const p = temporaryPassword();
      expect(p).toMatch(/^(?=.*[a-zA-Z])(?=.*\d).{12}$/);
    }
  });
});

describe("dhaka date ranges", () => {
  it("parses calendar days as Dhaka midnight", () => {
    expect(dhakaDayStart("2026-11-19")?.toISOString()).toBe("2026-11-18T18:00:00.000Z");
    expect(dhakaDayStart("2026-02-31")).toBeNull();
    expect(dhakaDayStart("19/11/2026")).toBeNull();
    expect(dhakaDay(new Date("2026-11-18T18:30:00Z"))).toBe("2026-11-19");
  });
  it("defaults to the last 7 days including today, end exclusive", () => {
    const r = parseDayRange(undefined, undefined, 7, new Date("2026-11-19T10:00:00Z"));
    expect(r.from).toBe("2026-11-13");
    expect(r.to).toBe("2026-11-19");
    expect(r.end.toISOString()).toBe("2026-11-19T18:00:00.000Z");
  });
  it("swaps reversed ranges", () => {
    const r = parseDayRange("2026-11-19", "2026-11-01");
    expect([r.from, r.to]).toEqual(["2026-11-01", "2026-11-19"]);
  });
});

describe("csv", () => {
  it("quotes and neutralises formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a"], [["x"]])).toBe("﻿a\r\nx\r\n");
  });
});

describe("admin schemas", () => {
  it("parses money and percentages to integers", () => {
    expect(priceText.parse("249.50")).toBe(24950);
    expect(priceText.parse("২৫০")).toBe(25000);
    expect(priceText.safeParse("abc").success).toBe(false);
    expect(percentText.parse("7.5")).toBe(750);
    expect(percentText.parse("")).toBe(0);
    expect(percentText.safeParse("60").success).toBe(false);
  });
  const item = {
    categoryId: "00000000-0000-4000-8000-000000000001",
    name: "Doi",
    nameBn: "",
    description: "",
    descriptionBn: "",
    price: "120",
    imagePath: null,
    tags: [],
    spiceLevel: 0,
    prepMinutes: 5,
    isAvailable: true,
    groups: [] as ReturnType<typeof group>[],
  };
  const group = (min: number, max: number, defaults = 0) => ({
    name: "G",
    nameBn: "",
    minSelect: min,
    maxSelect: max,
    options: [0, 1].map((i) => ({
      name: `o${i}`,
      nameBn: "",
      priceDelta: "0",
      isDefault: i < defaults,
      isAvailable: true,
    })),
  });
  it("validates modifier group rules", () => {
    expect(itemSchema.safeParse({ ...item, groups: [group(0, 1)] }).success).toBe(true);
    expect(itemSchema.safeParse({ ...item, groups: [group(2, 1)] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...item, groups: [group(3, 3)] }).success).toBe(false);
    expect(itemSchema.safeParse({ ...item, groups: [group(0, 1, 2)] }).success).toBe(false);
    expect(itemSchema.parse(item).nameBn).toBeNull();
  });
  it("only accepts storage paths inside a restaurant folder", () => {
    const base = {
      name: "X",
      tagline: "",
      address: "",
      phone: "",
      openingHours: "",
      wifi: "",
      vat: "7.5",
      serviceCharge: "5",
      defaultLocale: "en",
      accent: "saffron",
    };
    expect(
      settingsSchema.safeParse({
        ...base,
        logoPath: "00000000-0000-4000-8000-000000000001/logo-a1.webp",
      }).success,
    ).toBe(true);
    expect(settingsSchema.safeParse({ ...base, logoPath: "../secret.png" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, logoPath: null, accent: "#fff" }).success).toBe(
      false,
    );
  });
});

describe("brand accents", () => {
  it("default and unknown values produce no override", () => {
    expect(accentKey("#F59E0B")).toBe("saffron");
    expect(accentCss("saffron")).toBeNull();
    expect(accentCss(undefined)).toBeNull();
  });
  it("presets override light and dark tokens", () => {
    const css = accentCss("emerald")!;
    expect(css).toContain(":root:not(.dark){--primary-fill:");
    expect(css).toContain(":root.dark{--primary-fill:");
    expect(css).not.toMatch(/[<>]/); // safe to inline in <style>
  });
});
