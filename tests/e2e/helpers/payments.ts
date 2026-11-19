import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";

import { advance, ordersForTable, resetTable, staff } from "./db";
import { openMenu, placeOrderViaKeyboard, quickAdd, skipWelcome } from "./guest";

/** Fresh table → guest orders → waiter confirms & sends, so the bill has something due. */
export async function guestWithBill(browser: Browser, token: string, items = ["Mishti Doi"]) {
  await resetTable(token);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await skipWelcome(ctx, token);
  const page = await ctx.newPage();
  await openMenu(page, token);
  for (const item of items) await quickAdd(page, item);
  await placeOrderViaKeyboard(page);
  await page.waitForURL(/\/track$/);
  const [order] = await ordersForTable(token);
  await advance(await staff("waiter@demo.local"), order!.id, "in_kitchen");
  return { ctx, page };
}

/** Starts an online payment as the guest (their cookies) through the real init route. */
export async function startPayment(
  page: Page,
  sessionId: string,
  body: { channel?: string; amount_minor?: number } = {},
) {
  const res = await page.request.post("/api/payments/sslcommerz/init", {
    data: { session_id: sessionId, channel: "bkash", ...body },
  });
  return {
    status: res.status(),
    json: (await res.json()) as { url?: string; tran_id?: string; error?: string },
  };
}

export const mockValId = (tran: string, amountMinor: number, risk: 0 | 1 = 0) =>
  `MOCK.${tran}.${amountMinor}.${risk}`;

/** Simulates the SSLCommerz server-to-server IPN. */
export async function postIpn(
  request: APIRequestContext,
  fields: Record<string, string>,
): Promise<number> {
  const res = await request.post("/api/payments/sslcommerz/ipn", { form: fields });
  return res.status();
}

export async function expectTableDue(page: Page, text: RegExp | string) {
  await expect(page.getByTestId("bill-due")).toHaveText(text);
}
