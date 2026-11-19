import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";

import { advance, ordersForTable, resetTable, setItemAvailable, staff } from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./helpers/guest";
import { boardCard, DEMO_PASSWORD, loginAs } from "./helpers/staff";

async function guestOrders(browser: Browser, token: string, item = "Firni") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await skipWelcome(ctx, token);
  const page = await ctx.newPage();
  await openMenu(page, token);
  await quickAdd(page, item);
  await placeOrderViaKeyboard(page);
  await page.waitForURL(/\/track$/);
  const [order] = await ordersForTable(token);
  if (!order) throw new Error("order not found");
  return { ctx, page, orderId: order.id };
}

test.describe("staff auth & guards", () => {
  test("signed-out visitors are sent to login and back", async ({ page }) => {
    await page.goto("/staff/requests");
    await expect(page).toHaveURL(/\/login\?next=%2Fstaff%2Frequests/);
    await page.getByLabel("Email").fill("waiter@demo.local");
    await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD());
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/staff\/requests$/);
    // Start of shift
    await expect(page.getByRole("dialog", { name: /Ready for your shift/ })).toBeVisible();
    await page.getByRole("button", { name: "Start shift" }).click();
    await expect(page.getByRole("heading", { name: "Requests" })).toBeVisible();
  });

  test("wrong password shows a friendly error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("waiter@demo.local");
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
  });

  test("a guest (anonymous) session cannot open staff screens", async ({ page, context }) => {
    await skipWelcome(context, "e2e-18");
    await openMenu(page, "e2e-18");
    await page.goto("/staff/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("kitchen lands on sold-out list and cannot open the orders board", async ({ page }) => {
    await loginAs(page, "kitchen@demo.local");
    await expect(page).toHaveURL(/\/staff\/menu$/);
    await expect(page.getByRole("link", { name: /Orders/ })).toHaveCount(0);
    await page.goto("/staff/orders");
    await expect(
      page.getByRole("heading", { name: "You don’t have access to this page" }),
    ).toBeVisible();
  });
});

test.describe("orders board (1180×820)", () => {
  test("new order appears live, waiter confirms & sends, guest sees it cooking", async ({
    page,
    browser,
  }) => {
    const token = "e2e-13";
    await resetTable(token);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");

    const guest = await guestOrders(browser, token);
    const card = boardCard(page, guest.orderId);
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/New order · E13/)).toBeVisible();

    await card.getByRole("button", { name: "Confirm & send" }).click();
    await expect(
      page
        .locator('section[aria-labelledby="col-kitchen"]')
        .locator(`[data-order-id="${guest.orderId}"]`),
    ).toBeVisible();
    await expect(guest.page.getByRole("heading", { name: "The chef is cooking" })).toBeVisible();
    await guest.ctx.close();
  });

  test("reject with a reason: the guest sees it", async ({ page, browser }) => {
    const token = "e2e-14";
    await resetTable(token);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");
    const guest = await guestOrders(browser, token);

    await boardCard(page, guest.orderId).getByRole("button", { name: /E14/ }).click();
    await page.getByRole("button", { name: "Reject" }).click();
    await page.getByRole("button", { name: "Confirm & send" }).first().isVisible(); // sheet still open behind dialog
    const dialog = page.getByRole("dialog", { name: "Reject this order?" });
    await dialog.getByRole("button", { name: "Item sold out" }).click();
    await dialog.getByRole("button", { name: "Reject" }).click();
    await expect(boardCard(page, guest.orderId)).toHaveCount(0);
    await expect(
      guest.page.getByRole("heading", { name: "This order was cancelled" }),
    ).toBeVisible();
    await expect(guest.page.getByText("Reason: Item sold out")).toBeVisible();
    await guest.ctx.close();
  });

  test("two staff on the same order: the loser gets a clear message", async ({ page, browser }) => {
    const token = "e2e-15";
    await resetTable(token);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");
    const guest = await guestOrders(browser, token);
    const card = boardCard(page, guest.orderId);
    await expect(card).toBeVisible();

    // Freeze this tablet's view (no refetches), then a manager acts first elsewhere.
    await page.route("**/rest/v1/orders?**", (route) => route.abort());
    const manager = await staff("manager@demo.local");
    await advance(manager, guest.orderId, "in_kitchen");

    await card.getByRole("button", { name: "Confirm & send" }).click();
    await expect(page.getByText("This order was already updated by someone else")).toBeVisible();
    await page.unroute("**/rest/v1/orders?**");
    await guest.ctx.close();
  });

  test("guest requests show up live and can be resolved", async ({ page, browser }) => {
    const token = "e2e-16";
    await resetTable(token);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/requests");
    const guest = await guestOrders(browser, token);
    await guest.page.getByRole("button", { name: "Call waiter" }).click();
    await guest.page.getByRole("button", { name: "Cutlery" }).click();

    const item = page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: "E16" })
      .filter({ hasText: "Cutlery" });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Done" }).click();
    await expect(item).toHaveCount(0);
    await guest.ctx.close();
  });

  test("86-ing an item updates the guest menu live", async ({ page, browser }) => {
    const token = "e2e-17";
    await setItemAvailable("Beguni Basket", true);
    try {
      await loginAs(page, "waiter@demo.local");
      await page.goto("/staff/menu");
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await skipWelcome(ctx, token);
      const guest = await ctx.newPage();
      await openMenu(guest, token);
      await expect(guest.getByRole("button", { name: "Add Beguni Basket" })).toBeVisible();

      await page.getByRole("switch", { name: "Beguni Basket available" }).click();
      await expect(page.getByText("Beguni Basket marked sold out")).toBeVisible();
      await expect(guest.getByRole("button", { name: "Add Beguni Basket" })).toHaveCount(0, {
        timeout: 10_000,
      });
      await ctx.close();
    } finally {
      await setItemAvailable("Beguni Basket", true);
    }
  });

  test("board and login pass axe WCAG AA", async ({ page }) => {
    const scan = async () =>
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
    await page.goto("/login");
    expect(await scan()).toEqual([]);
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");
    await expect(
      page.getByRole("heading", { name: "New" }).or(page.getByText("No orders yet today")),
    ).toBeVisible();
    expect(await scan()).toEqual([]);
  });
});
