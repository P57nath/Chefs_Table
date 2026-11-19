import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { admin, liveSession, staff } from "./helpers/db";
import { guestWithBill, mockValId, postIpn, startPayment } from "./helpers/payments";

async function dueOf(sessionId: string): Promise<number> {
  const { data, error } = await (
    await staff("waiter@demo.local")
  ).rpc("session_bill", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return (data as { due_minor: number }).due_minor;
}

async function paymentByTran(tran: string) {
  const { data } = await admin()
    .from("payments")
    .select("status, amount_minor, gateway_payload")
    .eq("tran_id", tran)
    .single();
  return data!;
}

test.describe("bill & payments (390×844, mock gateway)", () => {
  test("bKash via the mock checkout → paid → celebration → feedback", async ({ browser }) => {
    const token = "e2e-09";
    const guest = await guestWithBill(browser, token);
    const { page } = guest;

    await page.getByRole("link", { name: "Bill & pay" }).click();
    await expect(page.getByRole("heading", { name: "Your bill", level: 1 })).toBeVisible();
    await expect(page.getByText("Mishti Doi")).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan.violations.map((v) => v.id)).toEqual([]);

    await page.getByRole("button", { name: "bKash" }).click();
    await expect(page.getByText("Test gateway · no real money")).toBeVisible();
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(page).toHaveURL(/\/payment\/result\?status=success&tran=ES-/);
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible();

    await page.getByRole("link", { name: "View bill" }).click();
    await expect(page.getByRole("heading", { name: "All paid — thank you!" })).toBeVisible();
    await page.locator("label", { has: page.getByRole("radio", { name: "5 of 5 stars" }) }).click();
    await expect(page.getByRole("radio", { name: "5 of 5 stars" })).toBeChecked();
    await page.getByLabel(/Anything you’d like to tell us/).fill("Lovely doi");
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByText("Thanks for your feedback!")).toBeVisible();

    const session = await liveSession(token);
    const { data: fb } = await admin()
      .from("feedback")
      .select("rating, comment")
      .eq("session_id", session!.id);
    expect(fb).toEqual([{ rating: 5, comment: "Lovely doi" }]);
    await guest.ctx.close();
  });

  test("split: guest pays part online, staff records the cash remainder", async ({ browser }) => {
    const token = "e2e-10";
    const guest = await guestWithBill(browser, token, ["Mishti Doi", "Firni"]);
    const { page } = guest;
    const session = await liveSession(token);
    const due = await dueOf(session!.id);

    await page.goto(`/t/${token}/bill`);
    await page.getByRole("radio", { name: "Split / custom" }).click();
    await page.getByLabel("Amount (৳)").fill("5");
    await expect(page.getByText("Online payments start at ৳10")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nagad" })).toBeDisabled();
    await page.getByLabel("Amount (৳)").fill("100");
    await page.getByRole("button", { name: "Nagad" }).click();
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible();
    expect(await dueOf(session!.id)).toBe(due - 10000);

    await page.getByRole("link", { name: "View bill" }).click();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
    const waiter = await staff("waiter@demo.local");
    const { error } = await waiter.rpc("record_cash_payment_once", {
      p_session_id: session!.id,
      p_amount_minor: due - 10000,
      p_channel: "cash",
      p_client_request_id: crypto.randomUUID(),
    });
    expect(error).toBeNull();
    // Live: the guest's bill flips without a reload.
    await expect(page.getByRole("heading", { name: "All paid — thank you!" })).toBeVisible();
    await guest.ctx.close();
  });

  test("init enforces the money rules on the server", async ({ browser }) => {
    const token = "e2e-11";
    const guest = await guestWithBill(browser, token);
    const session = await liveSession(token);
    const due = await dueOf(session!.id);

    expect(
      (await startPayment(guest.page, session!.id, { amount_minor: due + 1 })).json.error,
    ).toBe("AMOUNT_EXCEEDS_DUE");
    expect((await startPayment(guest.page, session!.id, { amount_minor: 500 })).json.error).toBe(
      "AMOUNT_TOO_SMALL",
    );
    expect((await startPayment(guest.page, session!.id, { channel: "paypal" })).status).toBe(400);
    // Someone who never scanned this table.
    const outsider = await browser.newContext();
    const res = await outsider.request.post("/api/payments/sslcommerz/init", {
      data: { session_id: session!.id, channel: "bkash" },
    });
    expect(res.status()).toBe(401);
    await outsider.close();
    await guest.ctx.close();
  });

  test("IPN: tampered amount rejected, replay counted once, return route redirects", async ({
    browser,
    request,
  }) => {
    const token = "e2e-25";
    const guest = await guestWithBill(browser, token);
    const session = await liveSession(token);
    const due = await dueOf(session!.id);
    const { json } = await startPayment(guest.page, session!.id);
    const tran = json.tran_id!;
    expect(json.url).toContain(`/api/payments/mock/checkout?tran=${tran}`);

    // The gateway charged a different amount than we asked for → not counted.
    expect(
      await postIpn(request, {
        tran_id: tran,
        val_id: mockValId(tran, due - 100),
        status: "VALID",
      }),
    ).toBe(200);
    expect((await paymentByTran(tran)).status).toBe("failed");
    expect(await dueOf(session!.id)).toBe(due);

    // The genuine IPN, delivered twice.
    const ipn = { tran_id: tran, val_id: mockValId(tran, due), status: "VALID" };
    expect(await postIpn(request, ipn)).toBe(200);
    expect(await postIpn(request, ipn)).toBe(200);
    const { data: paid } = await admin()
      .from("payments")
      .select("amount_minor")
      .eq("session_id", session!.id)
      .eq("status", "paid");
    expect(paid).toEqual([{ amount_minor: due }]);
    expect(await dueOf(session!.id)).toBe(0);

    // A late "cancel" from the browser can't undo it; the guest lands on the result page.
    const ret = await request.post("/api/payments/sslcommerz/return?r=cancel", {
      form: { tran_id: tran, status: "CANCELLED" },
      maxRedirects: 0,
    });
    expect(ret.status()).toBe(303);
    expect(ret.headers().location).toContain(
      `/t/${token}/payment/result?status=cancel&tran=${tran}`,
    );
    expect((await paymentByTran(tran)).status).toBe("paid");
    await guest.page.goto(ret.headers().location!);
    await expect(guest.page.getByRole("heading", { name: "Payment received" })).toBeVisible();

    // Unknown transaction → home, nothing touched.
    const bogus = await request.post("/api/payments/sslcommerz/return?r=success", {
      form: { tran_id: "ES-00000000000000000000", val_id: "x", status: "VALID" },
      maxRedirects: 0,
    });
    expect(bogus.headers().location).toMatch(/\/$/);
    await guest.ctx.close();
  });

  test("result page waits for the IPN, then shows the payment", async ({ browser, request }) => {
    const token = "e2e-26";
    const guest = await guestWithBill(browser, token);
    const session = await liveSession(token);
    const due = await dueOf(session!.id);
    const { json } = await startPayment(guest.page, session!.id, { channel: "card" });
    const tran = json.tran_id!;

    await guest.page.goto(`/t/${token}/payment/result?status=success&tran=${tran}`);
    await expect(
      guest.page.getByRole("heading", { name: "Confirming your payment…" }),
    ).toBeVisible();
    await postIpn(request, { tran_id: tran, val_id: mockValId(tran, due), status: "VALID" });
    await expect(guest.page.getByRole("heading", { name: "Payment received" })).toBeVisible();
    await guest.ctx.close();
  });

  test("cash asks the waiter to bring the bill", async ({ browser }) => {
    const token = "e2e-27";
    const guest = await guestWithBill(browser, token);
    await guest.page.goto(`/t/${token}/bill`);
    await guest.page.getByRole("button", { name: "Cash" }).click();
    await expect(
      guest.page.getByRole("button", { name: "Your waiter is bringing the bill" }),
    ).toBeDisabled();
    const session = await liveSession(token);
    const { data } = await admin()
      .from("service_requests")
      .select("type, note")
      .eq("session_id", session!.id);
    expect(data).toEqual([{ type: "request_bill", note: "Paying cash" }]);
    await guest.ctx.close();
  });
});
