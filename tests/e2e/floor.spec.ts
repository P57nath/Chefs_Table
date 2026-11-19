import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { admin, advance, liveSession, ordersForTable, resetTable, staff } from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./helpers/guest";
import { guestWithBill, mockValId, postIpn, startPayment } from "./helpers/payments";
import { loginAs } from "./helpers/staff";

async function guestOrder(browser: Browser, token: string, item = "Firni") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await skipWelcome(ctx, token);
  const page = await ctx.newPage();
  await openMenu(page, token);
  await quickAdd(page, item);
  await placeOrderViaKeyboard(page);
  await page.waitForURL(/\/track$/);
  return { ctx, page };
}

async function floorAs(page: Page, view: "3d" | "2d" | "list", email = "waiter@demo.local") {
  // Only seed the view once, so a choice made in the test survives reloads.
  await page.addInitScript((v) => {
    if (!localStorage.getItem("es-floor-view")) localStorage.setItem("es-floor-view", v);
  }, view);
  await loginAs(page, email);
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole("heading", { name: "Floor", level: 1 })).toBeVisible();
}

const tableCard = (page: Page, label: string) => page.locator(`button[data-table="${label}"]`);

test.describe("live floor (1180×820)", () => {
  test("a new order lights the table up live; the sheet confirms & sends", async ({
    page,
    browser,
  }) => {
    const token = "e2e-20";
    await resetTable(token);
    await floorAs(page, "list");
    const guest = await guestOrder(browser, token);

    const card = tableCard(page, "E20");
    await expect(card).toContainText("New order", { timeout: 5_000 });
    await card.click();
    const sheet = page.getByRole("dialog", { name: "Table E20" });
    await sheet.getByRole("button", { name: "Confirm & send" }).click();
    await expect(card).toContainText("In kitchen");
    await expect(guest.page.getByRole("heading", { name: "The chef is cooking" })).toBeVisible();
    await guest.ctx.close();
  });

  test("record cash (double tap = one payment) and close the table", async ({ page, browser }) => {
    const token = "e2e-21";
    await resetTable(token);
    const guest = await guestOrder(browser, token, "Mishti Doi");
    const [order] = await ordersForTable(token);
    const waiter = await staff("waiter@demo.local");
    await advance(waiter, order!.id, "in_kitchen");
    const kitchen = await staff("kitchen@demo.local");
    await advance(kitchen, order!.id, "ready");
    await advance(waiter, order!.id, "served");

    await floorAs(page, "list");
    await tableCard(page, "E21").click();
    const sheet = page.getByRole("dialog", { name: "Table E21" });
    await expect(sheet.getByText("Due", { exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Close table" })).toBeDisabled();

    const record = sheet.getByRole("button", { name: /^Record ৳/ });
    await record.dblclick();
    await expect(page.getByText(/recorded for E21/).first()).toBeVisible();
    const session = await liveSession(token);
    const { data: payments } = await admin()
      .from("payments")
      .select("id")
      .eq("session_id", session!.id);
    expect(payments).toHaveLength(1);

    await sheet.getByRole("button", { name: "Close table" }).click();
    await expect(page.getByText("E21 closed")).toBeVisible();
    await expect(
      guest.page.getByRole("heading", { name: "Thank you for dining with us!" }),
    ).toBeVisible();
    await guest.ctx.close();
  });

  test("a call-waiter request jumps to the top and can be resolved from the sheet", async ({
    page,
    browser,
  }) => {
    const token = "e2e-22";
    await resetTable(token);
    await floorAs(page, "list");
    const guest = await guestOrder(browser, token);
    await guest.page.getByRole("button", { name: "Call waiter" }).click();
    await guest.page.getByRole("button", { name: "Water" }).click();

    const card = tableCard(page, "E22");
    await expect(card).toContainText("Call waiter");
    await card.click();
    const sheet = page.getByRole("dialog", { name: "Table E22" });
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(card).toContainText("New order");
    await guest.ctx.close();
  });

  test("view choice is remembered and the 2D map opens tables", async ({ page }) => {
    await floorAs(page, "list");
    await page.getByRole("radio", { name: "Map" }).click();
    await expect(page.getByRole("group", { name: "Tables" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Map" })).toHaveAttribute("aria-checked", "true");
    await page.locator('g[data-table="T4"]').click();
    await expect(page.getByRole("dialog", { name: "Table T4" })).toBeVisible();
  });

  test("3D renders without console errors and is keyboard accessible", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await floorAs(page, "3d");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^Open table T4,/ })).toBeAttached();
    await page.getByRole("button", { name: /^Open table T4,/ }).focus();
    await expect(page.locator("[aria-live=polite]").filter({ hasText: "T4:" })).toBeAttached();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Table T4" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("without WebGL the 3D view falls back to the 2D map", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === "webgl" || type === "webgl2") return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await floorAs(page, "3d");
    await expect(page.getByText("3D isn’t available on this device")).toBeVisible();
    await expect(page.getByRole("group", { name: "Tables" })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test("floor list and map pass axe WCAG AA", async ({ page }) => {
    const scan = async () =>
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
    await floorAs(page, "list");
    await expect(page.getByRole("button", { name: /^Open table T1,/ })).toBeVisible();
    expect(await scan()).toEqual([]);
    await page.getByRole("radio", { name: "Map" }).click();
    await expect(page.getByRole("group", { name: "Tables" })).toBeVisible();
    expect(await scan()).toEqual([]);
  });

  test("an online payment shows Paid on the floor live", async ({ page, browser, request }) => {
    const token = "e2e-23";
    const guest = await guestWithBill(browser, token);
    await floorAs(page, "list");
    const card = tableCard(page, "E23");
    await expect(card).toContainText("In kitchen");

    const session = await liveSession(token);
    const { json } = await startPayment(guest.page, session!.id);
    const { data: bill } = await (
      await staff("waiter@demo.local")
    ).rpc("session_bill", {
      p_session_id: session!.id,
    });
    const due = (bill as { due_minor: number }).due_minor;
    await postIpn(request, {
      tran_id: json.tran_id!,
      val_id: mockValId(json.tran_id!, due),
      status: "VALID",
    });
    await expect(card).toContainText("Paid");
    await guest.ctx.close();
  });

  test("a risky payment waits for a manager, who approves it", async ({
    page,
    browser,
    request,
  }) => {
    const token = "e2e-24";
    const guest = await guestWithBill(browser, token);
    const session = await liveSession(token);
    const { json } = await startPayment(guest.page, session!.id);
    const { data: bill } = await (
      await staff("waiter@demo.local")
    ).rpc("session_bill", {
      p_session_id: session!.id,
    });
    const due = (bill as { due_minor: number }).due_minor;
    await postIpn(request, {
      tran_id: json.tran_id!,
      val_id: mockValId(json.tran_id!, due, 1),
      status: "VALID",
    });

    await floorAs(page, "list", "manager@demo.local");
    const card = tableCard(page, "E24");
    await expect(card).toContainText("Verify payment");
    await expect(card).not.toContainText("Paid");
    await card.click();
    const sheet = page.getByRole("dialog", { name: "Table E24" });
    await expect(sheet.getByText(/Flagged as risky/)).toBeVisible();
    await sheet.getByRole("button", { name: "Approve" }).click();
    await page
      .getByRole("alertdialog")
      .or(page.getByRole("dialog", { name: "Count this payment?" }))
      .getByRole("button", { name: "Approve" })
      .click();
    await expect(page.getByText("Payment approved")).toBeVisible();
    await expect(card).toContainText("Paid");
    await expect(card).not.toContainText("Verify payment");
    await guest.ctx.close();
  });
});
