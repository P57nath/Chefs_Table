import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ACCENTS } from "../../src/config/accents";

import { admin } from "./helpers/db";
import { openMenu, skipWelcome } from "./helpers/guest";
import { loginAs } from "./helpers/staff";

// 1×1 PNG, enough for the crop → WebP → upload pipeline.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const rand = () => Math.random().toString(36).slice(2, 7);

async function asManager(page: Page, path: string) {
  await loginAs(page, "manager@demo.local");
  await page.goto(path);
}

test.describe("admin (1180×820)", () => {
  test("only owners and managers get in", async ({ page }) => {
    await loginAs(page, "waiter@demo.local");
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "You don’t have access to this page" }),
    ).toBeVisible();
  });

  test("menu: add a category and a dish with photo and options; guests see it", async ({
    page,
    browser,
  }) => {
    const tag = rand();
    const category = `E2E Specials ${tag}`;
    const dish = `E2E Pudding ${tag}`;
    await asManager(page, "/admin/menu");
    await page.getByRole("button", { name: "Add category" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add category" });
    await dialog.getByLabel("Name (English)").fill(category);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: category, level: 2 })).toBeVisible();

    await page.getByRole("button", { name: "Add dish" }).click();
    const sheet = page.getByRole("dialog", { name: "Add dish" });
    await sheet
      .getByTestId("upload-item")
      .setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
    await page
      .getByRole("dialog", { name: "Crop photo" })
      .getByRole("button", { name: "Use photo" })
      .click();
    await expect(sheet.getByRole("button", { name: "Replace" })).toBeVisible();
    await sheet.getByLabel("Name (English)").fill(dish);
    await sheet.getByLabel("Price (৳)").fill("155.50");
    await sheet.getByRole("button", { name: "Add group" }).click();
    await sheet.getByLabel("Group name (English)").fill("Topping");
    await sheet.getByLabel("Option name (English)").fill("Nuts");
    await sheet.getByLabel(/Extra price for Nuts/).fill("20");
    await sheet.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(dish)).toBeVisible();
    await expect(page.getByText("৳155.50")).toBeVisible();

    const { data: item } = await admin()
      .from("menu_items")
      .select(
        "id, price_minor, image_path, category_id, modifier_groups ( modifier_options ( price_delta_minor ) )",
      )
      .eq("name", dish)
      .single();
    expect(item?.price_minor).toBe(15550);
    expect(item?.image_path).toMatch(/\/item-[0-9a-f-]+\.(webp|jpg)$/);
    expect(item?.modifier_groups[0]?.modifier_options[0]?.price_delta_minor).toBe(2000);

    // A guest sees the new dish (menu cache was revalidated).
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await skipWelcome(ctx, "e2e-29");
    const guest = await ctx.newPage();
    await openMenu(guest, "e2e-29");
    await expect(guest.getByText(dish)).toBeVisible();
    await ctx.close();

    // Test-only cleanup (no orders reference these rows).
    await admin().from("menu_items").delete().eq("category_id", item!.category_id);
    await admin().from("menu_categories").delete().eq("id", item!.category_id);
  });

  test("floor layout: move a table with the keyboard and save", async ({ page }) => {
    const { data: before } = await admin()
      .from("dining_tables")
      .select("id, pos_x")
      .eq("qr_token", "e2e-30")
      .single();
    await asManager(page, "/admin/floor");
    const handle = page.locator('g[data-table="E30"]');
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Save 1 change" }).click();
    await expect(page.getByText("Layout saved")).toBeVisible();
    const { data: after } = await admin()
      .from("dining_tables")
      .select("pos_x")
      .eq("id", before!.id)
      .single();
    expect(Number(after!.pos_x)).toBe(Number(before!.pos_x) + 1);
    await admin().from("dining_tables").update({ pos_x: before!.pos_x }).eq("id", before!.id);
  });

  test("rotating a QR code makes the printed one stop working", async ({ page, browser }) => {
    await asManager(page, "/admin/qr");
    const card = page.locator('[data-qr-table="E31"]');
    await card.getByRole("button", { name: "Rotate code" }).click();
    await page
      .getByRole("dialog", { name: "New QR code for E31?" })
      .getByRole("button", { name: "Rotate code" })
      .click();
    await expect(page.getByText("New code for E31")).toBeVisible();

    const ctx = await browser.newContext();
    const guest = await ctx.newPage();
    await guest.goto("/t/e2e-31");
    await expect(guest.getByRole("heading", { name: "This code isn’t active" })).toBeVisible();
    await ctx.close();
    // Restore the fixture token for the next run.
    await admin().from("dining_tables").update({ qr_token: "e2e-31" }).eq("label", "E31");
  });

  test("staff: a manager adds a waiter who can sign in", async ({ page, browser }) => {
    const email = `e2e-${rand()}@demo.local`;
    await asManager(page, "/admin/staff");
    await page.getByRole("button", { name: "Add team member" }).click();
    const dialog = page.getByRole("dialog", { name: "Add team member" });
    await dialog.getByLabel("Email").fill(email);
    await dialog.getByLabel("Display name").fill("E2E Waiter");
    await expect(dialog.getByLabel("Role")).not.toContainText("Owner");
    await dialog.getByLabel("Temporary password").fill("TempPass123");
    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("E2E Waiter can now sign in")).toBeVisible();
    await expect(page.locator(`[data-staff="${email}"]`)).toBeVisible();

    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await p2.goto("/login");
    await p2.getByLabel("Email").fill(email);
    await p2.getByLabel("Password", { exact: true }).fill("TempPass123");
    await p2.getByRole("button", { name: "Sign in" }).click();
    await expect(p2).toHaveURL(/\/staff/);
    await ctx.close();

    const { data } = await admin()
      .from("staff_members")
      .select("user_id")
      .eq("display_name", "E2E Waiter");
    for (const m of data ?? []) await admin().auth.admin.deleteUser(m.user_id);
  });

  test("payments export downloads a CSV", async ({ page }) => {
    await asManager(page, "/admin/payments");
    await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
    const res = await page.request.get("/admin/payments/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(await res.text()).toMatch(/^﻿created_at,paid_at,table,method,channel,status,amount_bdt/);
  });

  test("admin screens pass axe WCAG AA", async ({ page }) => {
    await loginAs(page, "manager@demo.local");
    for (const path of [
      "/admin",
      "/admin/menu",
      "/admin/floor",
      "/admin/staff",
      "/admin/settings",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        scan.violations.map(
          (v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        ),
      ).toEqual([]);
    }
  });

  test("settings: rebrand with a logo and accent; every accent keeps guest pages AA", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000); // 6 accents × 2 themes × axe
    const rid = process.env.DEMO_RESTAURANT_ID ?? "00000000-0000-4000-8000-000000000001";
    const { data: original } = await admin()
      .from("restaurants")
      .select("logo_path, settings")
      .eq("id", rid)
      .single();
    try {
      await asManager(page, "/admin/settings");
      await page
        .getByTestId("upload-logo")
        .setInputFiles({ name: "l.png", mimeType: "image/png", buffer: PNG });
      await page
        .getByRole("dialog", { name: "Crop photo" })
        .getByRole("button", { name: "Use photo" })
        .click();
      await page.getByText("Emerald").click();
      await page.getByRole("button", { name: "Save settings" }).click();
      await expect(page.getByText("Settings saved")).toBeVisible();

      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await skipWelcome(ctx, "e2e-32");
      const guest = await ctx.newPage();
      await openMenu(guest, "e2e-32");
      await expect(guest.locator("header img").first()).toBeVisible();
      for (const accent of ACCENTS) {
        const settings = { ...(original!.settings as Record<string, unknown>), accent: accent.key };
        await admin().from("restaurants").update({ settings }).eq("id", rid);
        for (const theme of ["dark", "light"]) {
          await guest.evaluate((t) => localStorage.setItem("es-theme-guest", t), theme);
          await guest.reload();
          await expect(guest.getByRole("heading", { name: "Starters" })).toBeVisible();
          const scan = await new AxeBuilder({ page: guest }).withTags(["wcag2aa"]).analyze();
          expect(scan.violations.map((v) => `${accent.key}/${theme} ${v.id}`)).toEqual([]);
        }
      }
      await ctx.close();
    } finally {
      await admin()
        .from("restaurants")
        .update({ logo_path: original!.logo_path, settings: original!.settings })
        .eq("id", rid);
    }
  });
});
