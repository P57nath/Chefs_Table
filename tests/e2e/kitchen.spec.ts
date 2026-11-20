import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { advance, ordersForTable, resetTable, staff } from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./helpers/guest";
import { loginAs } from "./helpers/staff";

test.describe("kitchen display (1920×1080)", () => {
  test("guest → waiter → kitchen → waiter → guest, all live", async ({ page, browser }) => {
    const token = "e2e-19";
    await resetTable(token);
    await loginAs(page, "kitchen@demo.local");
    await expect(page).toHaveURL(/\/kitchen$/);

    // Guest orders two dishes.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await skipWelcome(phone, token);
    const guest = await phone.newPage();
    await openMenu(guest, token);
    await quickAdd(guest, "Mishti Doi");
    await quickAdd(guest, "Beef Tehari");
    await placeOrderViaKeyboard(guest);
    await guest.waitForURL(/\/track$/);
    const [order] = await ordersForTable(token);

    // Waiter confirms & sends → ticket slides into "New".
    const waiter = await staff("waiter@demo.local");
    await advance(waiter, order!.id, "in_kitchen");
    const ticket = page.locator(`article[data-order-id="${order!.id}"]`);
    const newCol = page.locator('section[aria-labelledby="kds-new"]');
    await expect(newCol.locator(`article[data-order-id="${order!.id}"]`)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole("complementary").getByText("Beef Tehari")).toBeVisible();

    // Tick one line, start, then bump.
    const line = ticket.getByRole("button", { name: /Mishti Doi: tap when done/ });
    await line.click();
    await expect(ticket.getByRole("button", { name: /Mishti Doi: done/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await ticket.getByRole("button", { name: "Start", exact: true }).click();
    await expect(
      page
        .locator('section[aria-labelledby="kds-preparing"]')
        .locator(`article[data-order-id="${order!.id}"]`),
    ).toBeVisible();
    await expect(guest.getByRole("heading", { name: "The chef is cooking" })).toBeVisible();

    // Mid-animation the ticket briefly exists in two columns; act on the Preparing one.
    await page
      .locator('section[aria-labelledby="kds-preparing"]')
      .locator(`article[data-order-id="${order!.id}"]`)
      .getByRole("button", { name: "Ready", exact: true })
      .click();
    await expect(
      page
        .locator('section[aria-labelledby="kds-ready"]')
        .locator(`article[data-order-id="${order!.id}"]`),
    ).toBeVisible();
    await expect(guest.getByRole("heading", { name: "Ready, coming to your table" })).toBeVisible();

    await advance(waiter, order!.id, "served");
    await expect(guest.getByRole("heading", { name: "Enjoy your meal" })).toBeVisible();
    await phone.close();
  });

  test("a waiter cannot open the kitchen display", async ({ page }) => {
    await loginAs(page, "waiter@demo.local");
    await page.goto("/kitchen");
    await expect(
      page.getByRole("heading", { name: "You don’t have access to this page" }),
    ).toBeVisible();
  });

  test("kitchen passes axe WCAG AA and fits 1280×800 without horizontal scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, "kitchen@demo.local");
    await expect(page.getByRole("heading", { name: "Kitchen", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
      ),
    ).toEqual([]);
  });
});
