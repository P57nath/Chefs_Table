import { toMinor } from "@/lib/money";

import type { GatewayValidation } from "./types";

export type Assessment =
  | { outcome: "paid" | "pending_review"; amountMinor: number }
  | {
      outcome: "reject";
      reason: "NOT_VALID" | "TRAN_MISMATCH" | "CURRENCY_MISMATCH" | "AMOUNT_MISMATCH";
    };

/**
 * Decides what a Validation API answer means for our payment row
 * (docs/02 §7): only VALID/VALIDATED, same tran_id, BDT, and exactly our
 * amount count. risk_level 1 → staff must review. Never trust the form.
 */
export function assessValidation(
  v: GatewayValidation,
  expected: { tranId: string; amountMinor: number },
): Assessment {
  if (v.status !== "VALID" && v.status !== "VALIDATED")
    return { outcome: "reject", reason: "NOT_VALID" };
  if (v.tran_id !== expected.tranId) return { outcome: "reject", reason: "TRAN_MISMATCH" };
  const currency = (v.currency_type ?? v.currency ?? "").toUpperCase();
  if (currency !== "BDT") return { outcome: "reject", reason: "CURRENCY_MISMATCH" };
  const amount = gatewayAmountToMinor(v.currency_amount ?? v.amount);
  if (amount === null || amount !== expected.amountMinor) {
    return { outcome: "reject", reason: "AMOUNT_MISMATCH" };
  }
  const risky = String(v.risk_level ?? "0").trim() === "1";
  return { outcome: risky ? "pending_review" : "paid", amountMinor: amount };
}

/** "1234.5" / "1234.50" / "1234.5000" → 123450. Anything else → null. */
export function gatewayAmountToMinor(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const m = /^(\d{1,9})(?:\.(\d+))?$/.exec(trimmed);
  if (!m) return null;
  const fraction = m[2] ?? "";
  // Extra decimals must be zeros: "10.005" is not a whole poisha amount.
  if (fraction.length > 2 && /[^0]/.test(fraction.slice(2))) return null;
  return toMinor(`${m[1]}.${fraction.slice(0, 2) || "0"}`);
}

/** IPN / return status without a val_id → our status (null = ignore). */
export function failureStatusOf(status: string | undefined): "failed" | "cancelled" | null {
  switch ((status ?? "").toUpperCase()) {
    case "FAILED":
    case "EXPIRED":
      return "failed";
    case "CANCELLED":
    case "UNATTEMPTED":
      return "cancelled";
    default:
      return null;
  }
}

/** What we keep from the gateway (no card numbers or issuer details). */
export function auditPayload(v: GatewayValidation | null, extra: Record<string, string> = {}) {
  const keep = [
    "status",
    "tran_id",
    "val_id",
    "amount",
    "currency",
    "currency_type",
    "currency_amount",
    "risk_level",
    "risk_title",
    "card_type",
    "bank_tran_id",
    "tran_date",
  ] as const;
  const out: Record<string, string> = {};
  if (v) for (const k of keep) if (typeof v[k] === "string") out[k] = v[k];
  return { ...out, ...extra };
}
