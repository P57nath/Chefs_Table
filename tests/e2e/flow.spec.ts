import { expect, test } from "@playwright/test";

import { admin, liveSession, resetTable } from "./helpers/db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./helpers/guest";
import { loginAs } from "./helpers/staff";

/**
 * Architecture §10.1 — the whole evening on three devices, every step through
 * the real UI: guest phone (390×844) → waiter tablet (1180×820) → kitchen TV
 * (1920×1080) → served → bill → online part-payment → cash remainder → close → feedback.
 */
test("full flow on three devices, from scan to feedback", async ({ browser }) => {
  test.setTimeout(180_000);
  const token = "e2e-18";
  await resetTable(token);

  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const tabletCtx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await skipWelcome(phoneCtx, token);
  const guest = await phoneCtx.newPage();
  const waiter = await tabletCtx.newPage();
  const kitchen = await tvCtx.newPage();
  await waiter.addInitScript(() => localStorage.setItem("es-floor-view", "list"));

  await Promise.all([loginAs(waiter, "waiter@demo.local"), loginAs(kitchen, "kitchen@demo.local")]);

  // Guest orders.
  await openMenu(guest, token);
  await quickAdd(guest, "Mishti Doi");
  await quickAdd(guest, "Firni");
  await placeOrderViaKeyboard(guest);
  await guest.waitForURL(/\/track$/);

  // Waiter sees it live on the floor and confirms & sends from the table sheet.
  const card = waiter.locator('button[data-table="E18"]');
  await expect(card).toContainText("New order");
  await card.click();
  const sheet = waiter.getByRole("dialog", { name: "Table E18" });
  await sheet.getByRole("button", { name: "Confirm & send" }).click();
  await expect(guest.getByRole("heading", { name: "The chef is cooking" })).toBeVisible();

  // Kitchen starts and finishes the ticket.
  const sessionId = (await liveSession(token))!.id;
  const order = (await admin().from("orders").select("id").eq("session_id", sessionId).single())
    .data!;
  const ticket = kitchen.locator(`article[data-order-id="${order.id}"]`);
  await ticket.getByRole("button", { name: "Start", exact: true }).click();
  await kitchen
    .locator('section[aria-labelledby="kds-preparing"]')
    .locator(`article[data-order-id="${order.id}"]`)
    .getByRole("button", { name: "Ready", exact: true })
    .click();
  await expect(guest.getByRole("heading", { name: "Ready! Coming to your table" })).toBeVisible();
  await expect(card).toContainText("Ready");

  // Waiter serves.
  await sheet.getByRole("button", { name: "Mark served" }).click();
  await expect(guest.getByRole("heading", { name: "Enjoy your meal" })).toBeVisible();

  // Guest pays ৳100 online (mock gateway)…
  await guest.getByRole("link", { name: "Bill & pay" }).click();
  await guest.getByRole("radio", { name: "Split / custom" }).click();
  await guest.getByLabel("Amount (৳)").fill("100");
  await guest.getByRole("button", { name: "bKash" }).click();
  await guest.getByRole("button", { name: "Pay now" }).click();
  await expect(guest.getByRole("heading", { name: "Payment received" })).toBeVisible();

  // …and the rest in cash at the table; the waiter records it and closes.
  const record = sheet.getByRole("button", { name: /^Record ৳/ });
  await expect(record).toBeVisible();
  await record.click();
  // Durable signal (the toast is short-lived): nothing due, so the table can close.
  await expect(sheet.getByRole("button", { name: "Close table" })).toBeEnabled({ timeout: 20_000 });
  await sheet.getByRole("button", { name: "Close table" }).click();
  await expect(waiter.getByText("E18 closed")).toBeVisible();

  // Guest sees the thank-you screen and leaves feedback.
  await expect(guest.getByRole("heading", { name: "Thank you for dining with us!" })).toBeVisible();
  await guest.locator("label", { has: guest.getByRole("radio", { name: "4 of 5 stars" }) }).click();
  await guest.getByRole("button", { name: "Send feedback" }).click();
  await expect(guest.getByText("Thanks for your feedback!")).toBeVisible();

  const { data: pays } = await admin()
    .from("payments")
    .select("method, status")
    .eq("session_id", sessionId)
    .eq("status", "paid");
  expect(pays?.map((p) => p.method).sort()).toEqual(["cash", "sslcommerz"]);

  await Promise.all([phoneCtx.close(), tabletCtx.close(), tvCtx.close()]);
});
