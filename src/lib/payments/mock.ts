import "server-only";

import { toDecimalString } from "@/lib/money";

import type { GatewayValidation, PaymentGateway } from "./types";

/**
 * Development/test stand-in for SSLCommerz, refused in production by
 * env-schema. Its val_id encodes what the "gateway" charged, so tests can
 * play a tampered amount or a risky card:
 * `MOCK.<tran_id>.<amount poisha>.<risk 0|1>`.
 */
export function mockValId(tranId: string, amountMinor: number, risk: 0 | 1 = 0): string {
  return `MOCK.${tranId}.${amountMinor}.${risk}`;
}

export function createMockGateway(): PaymentGateway {
  return {
    name: "mock",
    async createSession(input) {
      return {
        url: `${input.appUrl}/api/payments/mock/checkout?tran=${encodeURIComponent(input.tranId)}`,
      };
    },
    async validate(valId): Promise<GatewayValidation> {
      const m = /^MOCK\.(ES-[0-9A-F]+)\.(\d{1,9})\.([01])$/.exec(valId);
      if (!m) return { status: "INVALID_TRANSACTION" };
      const amount = toDecimalString(Number(m[2]));
      return {
        status: "VALID",
        tran_id: m[1],
        val_id: valId,
        amount,
        currency: "BDT",
        currency_type: "BDT",
        currency_amount: amount,
        risk_level: m[3],
        risk_title: m[3] === "1" ? "High" : "Safe",
        card_type: "MOCK",
      };
    },
  };
}
