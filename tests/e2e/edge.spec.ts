import { expect, test, type Page } from "@playwright/test";

import { admin, advance, apiGuestOrder, ordersForTable, resetTable, staff } from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, skipWelcome } from "./helpers/guest";
import { guestWithBill } from "./helpers/payments";
import { loginAs } from "./helpers/staff";

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollWidth <= el.clientWidth + 1;
  });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("edge cases (Phase 10)", () => {
  test("guest goes offline, the waiter acts meanwhile, the tracker catches up on reconnect", async ({
    browser,
  }) => {
    const token = "e2e-12";
    const guest = await guestWithBill(browser, token);
    // guestWithBill already confirmed & sent; mark it ready while the phone is offline.
    await guest.page.waitForURL(/\/track$/);
    await guest.ctx.setOffline(true);
    await expect(guest.page.getByText(/offline|Reconnecting/).first()).toBeVisible({
      timeout: 15_000,
    });
    const [order] = await ordersForTable(token);
    await advance(await staff("kitchen@demo.local"), order!.id, "ready");
    await guest.ctx.setOffline(false);
    await expect(
      guest.page.getByRole("heading", { name: "Ready, coming to your table" }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await guest.ctx.close();
  });

  test("menu loads and orders on a slow 3G connection", async ({ browser }) => {
    test.setTimeout(120_000);
    const token = "e2e-13";
    await resetTable(token);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await skipWelcome(ctx, token);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 400,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
    });
    await page.goto(`/t/${token}`);
    await expect(page.getByRole("heading", { name: "Starters" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Add Firni" }).first().click();
    await placeOrderViaKeyboard(page);
    await page.waitForURL(/\/track$/, { timeout: 30_000 });
    await ctx.close();
  });

  test("very long Bangla dish names don't break the phone menu or the kitchen ticket", async ({
    browser,
    page,
  }) => {
    const longEn = "Slow-cooked Old Dhaka Mutton Kacchi with Saffron, Aloo Bukhara and Fried Onion";
    const longBn =
      "পুরান ঢাকার ঐতিহ্যবাহী জাফরান আলুবোখারা ও বেরেস্তা দিয়ে ধীরে রান্না খাসির কাচ্চি বিরিয়ানি";
    const { data: cat } = await admin()
      .from("menu_categories")
      .select("id, restaurant_id")
      .eq("name", "Starters")
      .single();
    const { data: item } = await admin()
      .from("menu_items")
      .insert({
        restaurant_id: cat!.restaurant_id,
        category_id: cat!.id,
        name: longEn,
        name_bn: longBn,
        price_minor: 99900,
        sort: -1,
      })
      .select("id")
      .single();
    try {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
      await ctx.addCookies([{ name: "NEXT_LOCALE", value: "bn", url: "http://localhost:3100" }]);
      await skipWelcome(ctx, "e2e-14");
      const guest = await ctx.newPage();
      await guest.goto("/t/e2e-14");
      await expect(guest.getByText(longBn).first()).toBeVisible();
      expect(await noHorizontalScroll(guest)).toBe(true);
      await ctx.close();

      await resetTable("e2e-14");
      const { orderId } = await apiGuestOrder("e2e-14", [longEn]);
      await advance(await staff("waiter@demo.local"), orderId, "in_kitchen");
      await page.setViewportSize({ width: 1280, height: 800 });
      await loginAs(page, "kitchen@demo.local");
      await expect(page.locator(`article[data-order-id="${orderId}"]`)).toContainText("Kacchi");
      expect(await noHorizontalScroll(page)).toBe(true);
    } finally {
      await resetTable("e2e-14");
      await admin().from("menu_items").update({ is_active: false }).eq("id", item!.id);
    }
  });

  test("a 14-line ticket is fully readable on the kitchen display", async ({ page }) => {
    await resetTable("e2e-15");
    const { orderId, count } = await apiGuestOrder("e2e-15", 14);
    expect(count).toBe(14);
    await advance(await staff("waiter@demo.local"), orderId, "in_kitchen");
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAs(page, "kitchen@demo.local");
    const ticket = page.locator(`article[data-order-id="${orderId}"]`);
    await expect(ticket.getByRole("button", { name: /tap when done/ })).toHaveCount(14);
    const last = ticket.getByRole("button", { name: /tap when done/ }).last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    expect(await noHorizontalScroll(page)).toBe(true);
    await resetTable("e2e-15");
  });

  test("an empty category is hidden from guests", async ({ browser }) => {
    const { data: r } = await admin().from("restaurants").select("id").limit(1).single();
    const { data: cat } = await admin()
      .from("menu_categories")
      .insert({ restaurant_id: r!.id, name: "E2E Empty", sort: 0 })
      .select("id")
      .single();
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await skipWelcome(ctx, "e2e-16");
      const guest = await ctx.newPage();
      await openMenu(guest, "e2e-16");
      await expect(guest.getByRole("heading", { name: "E2E Empty" })).toHaveCount(0);
      await ctx.close();
    } finally {
      await admin().from("menu_categories").delete().eq("id", cat!.id);
    }
  });

  test("a failed photo upload shows a clear message", async ({ page }) => {
    await page.route("**/storage/v1/object/**", (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ message: "boom" }) }),
    );
    await loginAs(page, "manager@demo.local");
    await page.goto("/admin/menu");
    await page.getByRole("button", { name: "Add dish" }).click();
    const sheet = page.getByRole("dialog", { name: "Add dish" });
    await sheet
      .getByTestId("upload-item")
      .setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
    await page
      .getByRole("dialog", { name: "Crop photo" })
      .getByRole("button", { name: "Use photo" })
      .click();
    await expect(
      page.getByText("Upload failed. Check your connection and try again."),
    ).toBeVisible();
  });

  test("an expired staff session sends the waiter to sign in and back", async ({ page }) => {
    await resetTable("e2e-17");
    const { orderId } = await apiGuestOrder("e2e-17", ["Firni"]);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");
    const card = page.locator(`article[data-order-id="${orderId}"]`);
    await expect(card).toBeVisible();
    await page.route("**/rest/v1/rpc/advance_order", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "PGRST301", message: "JWT expired" }),
      }),
    );
    await card.getByRole("button", { name: "Confirm & send" }).click();
    await expect(page).toHaveURL(/\/login\?expired=1&next=%2Fstaff%2Forders/);
    await expect(page.getByText("Your session has ended.", { exact: false })).toBeVisible();
    await resetTable("e2e-17");
  });
});
