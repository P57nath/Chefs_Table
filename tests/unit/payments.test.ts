import {
  assessValidation,
  auditPayload,
  failureStatusOf,
  gatewayAmountToMinor,
} from "@/lib/payments/assess";
import { createMockGateway, mockValId } from "@/lib/payments/mock";
import { CHANNEL_CARDS, createSslcommerzGateway, sessionForm } from "@/lib/payments/sslcommerz";
import { GatewayError, type CreateSessionInput } from "@/lib/payments/types";

const TRAN = "ES-0123456789ABCDEF0123";
const valid = {
  status: "VALID",
  tran_id: TRAN,
  val_id: "v1",
  amount: "1234.50",
  currency: "BDT",
  currency_type: "BDT",
  currency_amount: "1234.50",
  risk_level: "0",
};

describe("assessValidation (docs/02 §7)", () => {
  const expected = { tranId: TRAN, amountMinor: 123450 };

  it("accepts VALID and VALIDATED with matching tran, currency and amount", () => {
    expect(assessValidation(valid, expected)).toEqual({ outcome: "paid", amountMinor: 123450 });
    expect(assessValidation({ ...valid, status: "VALIDATED" }, expected).outcome).toBe("paid");
  });

  it("parks risk_level 1 for staff review", () => {
    expect(assessValidation({ ...valid, risk_level: "1" }, expected).outcome).toBe(
      "pending_review",
    );
  });

  it.each([
    [{ status: "INVALID_TRANSACTION" }, "NOT_VALID"],
    [{ status: "FAILED" }, "NOT_VALID"],
    [{ tran_id: "ES-FFFFFFFFFFFFFFFFFFFF" }, "TRAN_MISMATCH"],
    [{ currency_type: "USD", currency: "BDT" }, "CURRENCY_MISMATCH"],
    [{ currency_amount: "1234.49" }, "AMOUNT_MISMATCH"],
    [{ currency_amount: "12345.00" }, "AMOUNT_MISMATCH"],
    [{ currency_amount: "abc" }, "AMOUNT_MISMATCH"],
    [{ currency_amount: undefined, amount: undefined }, "AMOUNT_MISMATCH"],
  ])("rejects tampering %o → %s", (patch, reason) => {
    expect(assessValidation({ ...valid, ...patch }, expected)).toEqual({
      outcome: "reject",
      reason,
    });
  });

  it("uses currency_amount (charged in BDT), not a converted amount", () => {
    expect(
      assessValidation({ ...valid, amount: "999.00", currency_amount: "1234.50" }, expected)
        .outcome,
    ).toBe("paid");
  });
});

describe("gatewayAmountToMinor", () => {
  it.each([
    ["1234.5", 123450],
    ["1234.50", 123450],
    ["1234.5000", 123450],
    ["10", 1000],
    [" 99.99 ", 9999],
  ])("%s → %d", (input, minor) => expect(gatewayAmountToMinor(input)).toBe(minor));

  it.each(["10.005", "-5.00", "1e3", "", "12,50"])("rejects %s", (input) =>
    expect(gatewayAmountToMinor(input)).toBeNull(),
  );
});

describe("failureStatusOf", () => {
  it("maps gateway statuses without a val_id", () => {
    expect(failureStatusOf("FAILED")).toBe("failed");
    expect(failureStatusOf("EXPIRED")).toBe("failed");
    expect(failureStatusOf("CANCELLED")).toBe("cancelled");
    expect(failureStatusOf("UNATTEMPTED")).toBe("cancelled");
    expect(failureStatusOf("VALID")).toBeNull(); // success needs a val_id + validation
    expect(failureStatusOf(undefined)).toBeNull();
  });
});

describe("auditPayload", () => {
  it("keeps only non-sensitive fields", () => {
    const out = auditPayload(
      { ...valid, card_no: "432149XXXXXX0667", card_issuer: "BANK" } as typeof valid,
      { review_reason: "RISK" },
    );
    expect(out).not.toHaveProperty("card_no");
    expect(out).not.toHaveProperty("card_issuer");
    expect(out).toMatchObject({ tran_id: TRAN, review_reason: "RISK" });
  });
});

const input: CreateSessionInput = {
  tranId: TRAN,
  amountMinor: 123450,
  currency: "BDT",
  channel: "nagad",
  sessionId: "11111111-1111-4111-8111-111111111111",
  tableToken: "demo-table-01",
  tableLabel: "T1",
  restaurantName: "Ember & Spice",
  appUrl: "https://table.example.com",
};
const customer = {
  email: "guest@example.com",
  phone: "01700000000",
  address: "Dine-in",
  city: "Dhaka",
  postcode: "1000",
};

describe("SSLCommerz session form", () => {
  it("sends the exact decimal amount, callbacks and channel", () => {
    const f = sessionForm(input, { storeId: "s", storePassword: "p" }, customer);
    expect(f.get("total_amount")).toBe("1234.50");
    expect(f.get("currency")).toBe("BDT");
    expect(f.get("tran_id")).toBe(TRAN);
    expect(f.get("success_url")).toBe(
      "https://table.example.com/api/payments/sslcommerz/return?r=success",
    );
    expect(f.get("ipn_url")).toBe("https://table.example.com/api/payments/sslcommerz/ipn");
    expect(f.get("multi_card_name")).toBe("mobilebank");
    expect(f.get("value_b")).toBe("demo-table-01");
    expect(f.get("shipping_method")).toBe("NO");
    expect(f.get("cus_postcode")).toBe("1000");
  });

  it("keeps multi_card_name within the 30-char limit", () => {
    for (const v of Object.values(CHANNEL_CARDS)) expect(v.length).toBeLessThanOrEqual(30);
  });
});

function gatewayWith(response: unknown, status = 200) {
  const fetchImpl = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const gw = createSslcommerzGateway({
    mode: "sandbox",
    storeId: "store",
    storePassword: "pass",
    customer,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { gw, fetchImpl };
}

describe("SSLCommerz gateway", () => {
  it("returns the hosted page URL on SUCCESS", async () => {
    const { gw, fetchImpl } = gatewayWith({
      status: "SUCCESS",
      GatewayPageURL: "https://sandbox.sslcommerz.com/EasyCheckOut/abc",
    });
    await expect(gw.createSession(input)).resolves.toEqual({
      url: "https://sandbox.sslcommerz.com/EasyCheckOut/abc",
    });
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
      "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
    );
  });

  it("refuses to send guests to a non-SSLCommerz host", async () => {
    const { gw } = gatewayWith({ status: "SUCCESS", GatewayPageURL: "https://evil.example/x" });
    await expect(gw.createSession(input)).rejects.toBeInstanceOf(GatewayError);
  });

  it("surfaces FAILED as a non-transient error", async () => {
    const { gw } = gatewayWith({ status: "FAILED", failedreason: "Store Credential Error" });
    await expect(gw.createSession(input)).rejects.toMatchObject({ transient: false });
  });

  it("treats 5xx as transient (IPN will be retried)", async () => {
    const { gw } = gatewayWith({}, 503);
    await expect(gw.validate("v")).rejects.toMatchObject({ transient: true });
  });

  it("parses the validation response (numbers coerced to strings)", async () => {
    const { gw } = gatewayWith({ ...valid, amount: 1234.5, risk_level: 0 });
    const v = await gw.validate("v1");
    expect(v.amount).toBe("1234.5");
    expect(v.risk_level).toBe("0");
  });
});

describe("mock gateway", () => {
  it("round-trips the encoded val_id through validation", async () => {
    const v = await createMockGateway().validate(mockValId(TRAN, 123450, 1));
    expect(assessValidation(v, { tranId: TRAN, amountMinor: 123450 }).outcome).toBe(
      "pending_review",
    );
  });

  it("a tampered amount fails validation", async () => {
    const v = await createMockGateway().validate(mockValId(TRAN, 100));
    expect(assessValidation(v, { tranId: TRAN, amountMinor: 123450 })).toMatchObject({
      reason: "AMOUNT_MISMATCH",
    });
  });

  it("unknown val_id is not valid", async () => {
    expect((await createMockGateway().validate("random")).status).toBe("INVALID_TRANSACTION");
  });
});
