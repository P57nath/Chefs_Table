import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  advance,
  closeSession,
  liveSession,
  ordersForTable,
  resetTable,
  setItemAvailable,
  staff,
} from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./helpers/guest";

// Each test owns one demo table so tests can run in parallel.
test.describe("guest app (390×844)", () => {
  test("welcome → menu → cart → order → live tracker through every stage", async ({ page }) => {
    const token = "e2e-01";
    await resetTable(token);

    await page.goto(`/t/${token}`);
    await expect(page.getByRole("dialog", { name: /Welcome to Ember & Spice/ })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Table E1")).toBeVisible();
    await page.getByRole("button", { name: "View menu" }).click();
    await expect(page.getByRole("heading", { name: "Chef’s specials" })).toBeVisible();

    await quickAdd(page, "Mishti Doi");
    await page.getByRole("button", { name: "Choose options for Ember Smash Burger" }).click();
    await page.getByRole("radio", { name: /Double/ }).click();
    await page.getByRole("checkbox", { name: /Cheddar cheese/ }).click();
    await page.getByRole("button", { name: "Add · ৳600" }).click(); // 390 + Double 150 + cheese 60
    await expect(page.getByRole("button", { name: /View cart/ })).toContainText("2 items");

    await placeOrderViaKeyboard(page);
    await page.waitForURL(/\/track$/);
    await expect(
      page.getByRole("heading", { name: "Your order is with your waiter" }),
    ).toBeVisible();
    await expect(page.getByText("Round 1")).toBeVisible();

    const [order] = await ordersForTable(token);
    expect(order?.status).toBe("placed");
    const waiter = await staff("waiter@demo.local");
    await advance(waiter, order!.id, "in_kitchen");
    await expect(page.getByRole("heading", { name: "The chef is cooking" })).toBeVisible();

    const kitchen = await staff("kitchen@demo.local");
    await advance(kitchen, order!.id, "ready");
    await expect(page.getByRole("heading", { name: "Ready, coming to your table" })).toBeVisible();

    await advance(waiter, order!.id, "served");
    await expect(page.getByRole("heading", { name: "Enjoy your meal" })).toBeVisible();
  });

  test("a lost response + retry creates exactly one order (idempotent)", async ({
    page,
    context,
  }) => {
    const token = "e2e-02";
    await resetTable(token);
    await skipWelcome(context, token);
    await openMenu(page, token);
    await quickAdd(page, "Firni");

    // The first place_order reaches the server, but the phone never sees the answer.
    let dropped = false;
    await page.route("**/rest/v1/rpc/place_order", async (route) => {
      if (dropped) return route.continue();
      dropped = true;
      await route.fetch();
      await route.abort("failed");
    });

    await placeOrderViaKeyboard(page);
    await expect(page.getByText("Connection lost while sending")).toBeVisible();
    // Cart is frozen until the outcome is known.
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();

    await page.getByRole("button", { name: "Retry sending" }).click();
    await page.waitForURL(/\/track$/);
    await expect(page.getByText("Round 1")).toBeVisible();
    await expect(page.getByText("Round 2")).toHaveCount(0);
    expect(await ordersForTable(token)).toHaveLength(1);
  });

  test("double-activating the slide control places one order", async ({ page, context }) => {
    const token = "e2e-03";
    await resetTable(token);
    await skipWelcome(context, token);
    await openMenu(page, token);
    await quickAdd(page, "Mishti Doi");
    await page.getByRole("button", { name: /View cart/ }).click();
    const slide = page.getByRole("button", { name: "Slide to place order" });
    await slide.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/track$/);
    expect(await ordersForTable(token)).toHaveLength(1);
  });

  test("an item that sells out mid-cart is flagged and blocks ordering", async ({
    page,
    context,
  }) => {
    const token = "e2e-04";
    await resetTable(token);
    await skipWelcome(context, token);
    await setItemAvailable("Plain Polao", true);
    try {
      await openMenu(page, token);
      await quickAdd(page, "Plain Polao");
      await setItemAvailable("Plain Polao", false); // kitchen 86'd it
      await page.getByRole("button", { name: /View cart/ }).click();
      await expect(page.getByText("Just sold out")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: "Slide to place order" })).toBeDisabled();
      await page.getByRole("button", { name: "Remove Plain Polao" }).click();
      await expect(page.getByText("Your cart is empty")).toBeVisible();
    } finally {
      await setItemAvailable("Plain Polao", true);
    }
  });

  test("two phones at the same table see each other's orders live", async ({ browser }) => {
    const token = "e2e-05";
    await resetTable(token);
    const phoneA = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phoneB = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await skipWelcome(phoneA, token);
    await skipWelcome(phoneB, token);
    const a = await phoneA.newPage();
    const b = await phoneB.newPage();

    await b.goto(`/t/${token}/track`);
    await expect(b.getByText("No orders yet")).toBeVisible();

    await openMenu(a, token);
    await quickAdd(a, "Mishti Doi");
    await placeOrderViaKeyboard(a);
    await a.waitForURL(/\/track$/);

    await expect(b.getByText("Round 1")).toBeVisible({ timeout: 15_000 });
    await expect(b.getByText("Mishti Doi")).toBeVisible();
    await phoneA.close();
    await phoneB.close();
  });

  test("guest can cancel while unconfirmed and call the waiter once", async ({ page, context }) => {
    const token = "e2e-06";
    await resetTable(token);
    await skipWelcome(context, token);
    await openMenu(page, token);
    await quickAdd(page, "Firni");
    await placeOrderViaKeyboard(page);
    await page.waitForURL(/\/track$/);

    await page.getByRole("button", { name: "Call waiter" }).click();
    await page.getByRole("button", { name: "Water" }).click();
    await expect(page.getByText("Your waiter has been notified").first()).toBeVisible();
    await page.getByRole("button", { name: "Call waiter" }).click();
    await expect(page.getByRole("button", { name: /Water/ })).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel order" }).click();
    await expect(page.getByRole("heading", { name: "This order was cancelled" })).toBeVisible();
  });

  test("closed table shows thank-you and can start a new order", async ({ page, context }) => {
    const token = "e2e-07";
    await resetTable(token);
    await skipWelcome(context, token);
    await openMenu(page, token);
    // The menu paints before the background join finishes; wait for the session row.
    await expect.poll(() => liveSession(token), { timeout: 10_000 }).not.toBeNull();
    const session = await liveSession(token);

    const manager = await staff("manager@demo.local");
    await closeSession(manager, session!.id);
    await expect(page.getByRole("heading", { name: "Thank you for dining with us" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Start a new order" }).click();
    await expect(page.getByRole("heading", { name: "Starters" })).toBeVisible();
    const fresh = await liveSession(token);
    expect(fresh?.id).not.toBe(session!.id);
  });

  test("invalid QR shows a friendly message without signing in", async ({ page }) => {
    await page.goto("/t/not-a-real-table");
    await expect(page.getByRole("heading", { name: "This code isn’t active" })).toBeVisible();
  });

  test("Bangla menu with Bangla digits", async ({ page, context }) => {
    const token = "e2e-08";
    await skipWelcome(context, token);
    await context.addCookies([{ name: "NEXT_LOCALE", value: "bn", url: "http://localhost:3100" }]);
    await page.goto(`/t/${token}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { name: "স্টার্টার" })).toBeVisible();
    await expect(page.getByText("৳১৬০").first()).toBeVisible();
  });

  test("reduced motion: no ember particles, overlay still dismisses", async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto("/t/e2e-08");
    await expect(page.getByRole("dialog", { name: /Welcome/ })).toBeVisible();
    await expect(page.locator("[data-welcome-overlay] .motion-reduce\\:hidden")).toBeHidden();
    await expect(page.getByRole("dialog", { name: /Welcome/ })).toBeHidden({ timeout: 5_000 });
    await expect(page.getByRole("heading", { name: "Starters" })).toBeVisible();
    await ctx.close();
  });
});

test.describe("guest accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`menu and tracker pass axe WCAG AA (${theme})`, async ({ page, context }) => {
      const token = "e2e-12";
      await skipWelcome(context, token);
      await context.addInitScript((t) => localStorage.setItem("es-theme-guest", t), theme);
      const scan = async () =>
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations.map(
          (v) =>
            `${v.id}: ${v.help} ${v.nodes.map((n) => `${n.target.join(" ")} ${n.failureSummary ?? ""}`).join(" | ")}`,
        );

      await openMenu(page, token);
      expect(await scan()).toEqual([]);
      await page.goto(`/t/${token}/track`);
      await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
      await expect(page.getByText(/No orders yet|Round 1/).first()).toBeVisible();
      expect(await scan()).toEqual([]);
    });
  }
});
