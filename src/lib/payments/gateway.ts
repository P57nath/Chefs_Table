import "server-only";

import { serverEnv } from "@/lib/env.server";

import { createMockGateway } from "./mock";
import { createSslcommerzGateway, type CustomerDefaults } from "./sslcommerz";
import type { PaymentGateway } from "./types";

/**
 * Placeholder customer fields SSLCommerz requires (guests are anonymous).
 * Overridable per restaurant via `settings.payment_customer`.
 */
export function customerDefaults(settings: unknown): CustomerDefaults {
  let s: Record<string, unknown> = {};
  if (settings && typeof settings === "object" && "payment_customer" in settings) {
    const pc = (settings as { payment_customer: unknown }).payment_customer;
    if (pc && typeof pc === "object") s = pc as Record<string, unknown>;
  }
  const pick = (k: string, fallback: string) => {
    const v = s[k];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  };
  return {
    email: pick("email", "guest@example.com"),
    phone: pick("phone", "01700000000"),
    address: pick("address", "Dine-in"),
    city: pick("city", "Dhaka"),
    postcode: pick("postcode", "1000"),
  };
}

/** The configured gateway (PAYMENT_GATEWAY). Mock is refused in production by env-schema. */
export function getPaymentGateway(customer?: CustomerDefaults): PaymentGateway {
  if (serverEnv.PAYMENT_GATEWAY === "mock") return createMockGateway();
  return createSslcommerzGateway({
    mode: serverEnv.SSLCOMMERZ_MODE,
    // env-schema guarantees both are set when PAYMENT_GATEWAY=sslcommerz.
    storeId: serverEnv.SSLCOMMERZ_STORE_ID ?? "",
    storePassword: serverEnv.SSLCOMMERZ_STORE_PASSWORD ?? "",
    customer: customer ?? customerDefaults(null),
  });
}
