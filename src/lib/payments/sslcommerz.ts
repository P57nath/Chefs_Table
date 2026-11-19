import "server-only";

import { z } from "@/lib/zod";

import { toDecimalString } from "@/lib/money";

import {
  GatewayError,
  type CreateSessionInput,
  type GatewayValidation,
  type PaymentChannel,
  type PaymentGateway,
} from "./types";

const HOSTS = {
  sandbox: "https://sandbox.sslcommerz.com",
  live: "https://securepay.sslcommerz.com",
} as const;

/**
 * `multi_card_name` pre-selects the channel on the hosted page. SSLCommerz
 * has no Nagad-only key, so Nagad opens the mobile-banking group.
 */
export const CHANNEL_CARDS: Record<PaymentChannel, string> = {
  bkash: "bkash",
  nagad: "mobilebank",
  card: "visacard,mastercard,amexcard",
  bank: "internetbank",
};

export interface CustomerDefaults {
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
}

const sessionResponse = z.object({
  status: z.string(),
  failedreason: z.string().nullish(),
  GatewayPageURL: z.string().nullish(),
});

const validationResponse = z
  .object({
    status: z.string(),
    tran_id: z.string().optional(),
    val_id: z.string().optional(),
    amount: z.coerce.string().optional(),
    currency: z.string().optional(),
    currency_type: z.string().optional(),
    currency_amount: z.coerce.string().optional(),
    risk_level: z.coerce.string().optional(),
    risk_title: z.string().optional(),
    card_type: z.string().optional(),
    bank_tran_id: z.string().optional(),
    tran_date: z.string().optional(),
  })
  .loose();

/** Builds the form for /gwprocess/v4/api.php (exported for unit tests). */
export function sessionForm(
  input: CreateSessionInput,
  creds: { storeId: string; storePassword: string },
  customer: CustomerDefaults,
): URLSearchParams {
  const back = (r: string) => `${input.appUrl}/api/payments/sslcommerz/return?r=${r}`;
  return new URLSearchParams({
    store_id: creds.storeId,
    store_passwd: creds.storePassword,
    total_amount: toDecimalString(input.amountMinor),
    currency: input.currency,
    tran_id: input.tranId,
    success_url: back("success"),
    fail_url: back("fail"),
    cancel_url: back("cancel"),
    ipn_url: `${input.appUrl}/api/payments/sslcommerz/ipn`,
    multi_card_name: CHANNEL_CARDS[input.channel],
    value_a: input.sessionId,
    value_b: input.tableToken,
    product_name: `Table ${input.tableLabel} bill`.slice(0, 255),
    product_category: "Food",
    product_profile: "general",
    num_of_item: "1",
    shipping_method: "NO",
    cus_name: `${input.restaurantName} guest`.slice(0, 50),
    cus_email: customer.email,
    cus_add1: customer.address,
    cus_city: customer.city,
    cus_postcode: customer.postcode,
    cus_country: "Bangladesh",
    cus_phone: customer.phone,
  });
}

export function createSslcommerzGateway(config: {
  mode: "sandbox" | "live";
  storeId: string;
  storePassword: string;
  customer: CustomerDefaults;
  fetchImpl?: typeof fetch;
}): PaymentGateway {
  const host = HOSTS[config.mode];
  const doFetch = config.fetchImpl ?? fetch;
  const creds = { storeId: config.storeId, storePassword: config.storePassword };

  async function call(url: string, init?: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await doFetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      throw new GatewayError(`SSLCommerz unreachable: ${String(err)}`, true);
    }
    if (!res.ok) throw new GatewayError(`SSLCommerz HTTP ${res.status}`, res.status >= 500);
    try {
      return await res.json();
    } catch {
      throw new GatewayError("SSLCommerz returned non-JSON", true);
    }
  }

  return {
    name: "sslcommerz",
    async createSession(input) {
      const body = sessionForm(input, creds, config.customer);
      const parsed = sessionResponse.safeParse(
        await call(`${host}/gwprocess/v4/api.php`, { method: "POST", body }),
      );
      if (!parsed.success || parsed.data.status !== "SUCCESS" || !parsed.data.GatewayPageURL) {
        const reason = parsed.success ? parsed.data.failedreason : "bad response";
        throw new GatewayError(`SSLCommerz session failed: ${reason ?? "unknown"}`, false);
      }
      const url = new URL(parsed.data.GatewayPageURL);
      // Only ever send a guest to SSLCommerz itself.
      if (url.protocol !== "https:" || !url.hostname.endsWith("sslcommerz.com")) {
        throw new GatewayError(`Unexpected gateway URL host ${url.hostname}`, false);
      }
      return { url: url.toString() };
    },
    async validate(valId): Promise<GatewayValidation> {
      const qs = new URLSearchParams({
        val_id: valId,
        store_id: creds.storeId,
        store_passwd: creds.storePassword,
        format: "json",
        v: "1",
      });
      const parsed = validationResponse.safeParse(
        await call(`${host}/validator/api/validationserverAPI.php?${qs}`),
      );
      if (!parsed.success) throw new GatewayError("SSLCommerz validation: bad response", true);
      return parsed.data;
    },
  };
}
