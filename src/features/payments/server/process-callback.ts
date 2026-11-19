import "server-only";

import { assessValidation, auditPayload, failureStatusOf } from "@/lib/payments/assess";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { GatewayError, type GatewayValidation } from "@/lib/payments/types";
import { reportError } from "@/lib/errors";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface CallbackFields {
  tran_id?: string | null;
  val_id?: string | null;
  status?: string | null;
}

export interface CallbackResult {
  /** Table QR token, looked up in our DB (never taken from the form). */
  token: string | null;
  tranId: string | null;
  status: PaymentStatus | null;
}

/** Thrown when the outcome is unknown (gateway / DB down): the caller answers 503 so it is retried. */
export class TransientCallbackError extends Error {}

const TRAN_ID = /^ES-[0-9A-F]{20}$/;

/**
 * Shared by the IPN and the browser return route (docs/02 §7). Reads only
 * tran_id / val_id / status from the form; everything else comes from the
 * Validation API and our own payment row. Idempotent: safe to run any
 * number of times for the same transaction.
 */
export async function processGatewayCallback(fields: CallbackFields): Promise<CallbackResult> {
  const tranId = fields.tran_id?.trim() ?? "";
  if (!TRAN_ID.test(tranId)) return { token: null, tranId: null, status: null };

  const db = getAdminSupabase();
  const { data: payment, error } = await db
    .from("payments")
    .select("id, amount_minor, status, table_sessions ( dining_tables ( qr_token ) )")
    .eq("tran_id", tranId)
    .eq("method", "sslcommerz")
    .maybeSingle();
  if (error) throw new TransientCallbackError(error.message);
  if (!payment) return { token: null, tranId: null, status: null };

  const token = payment.table_sessions?.dining_tables?.qr_token ?? null;
  const done = (status: PaymentStatus | null) => ({ token, tranId, status });

  const valId = fields.val_id?.trim();
  let target: PaymentStatus | null = null;
  let amount = payment.amount_minor;
  let payload: Record<string, string> = {};

  if (valId) {
    let validation: GatewayValidation;
    try {
      validation = await getPaymentGateway().validate(valId.slice(0, 100));
    } catch (err) {
      if (err instanceof GatewayError) throw new TransientCallbackError(err.message);
      throw err;
    }
    const verdict = assessValidation(validation, {
      tranId,
      amountMinor: payment.amount_minor,
    });
    if (verdict.outcome === "reject") {
      reportError(new Error(`Gateway validation rejected: ${verdict.reason}`), { tranId });
      target = "failed";
      payload = auditPayload(validation, { reject_reason: verdict.reason });
    } else {
      target = verdict.outcome;
      amount = verdict.amountMinor;
      payload = auditPayload(
        validation,
        verdict.outcome === "pending_review" ? { review_reason: "RISK" } : {},
      );
    }
  } else {
    target = failureStatusOf(fields.status ?? undefined);
    payload = { status: String(fields.status ?? "").slice(0, 20), source: "callback" };
  }

  if (!target) return done(payment.status);

  const { data: settled, error: settleError } = await db.rpc("settle_gateway_payment", {
    p_tran_id: tranId,
    p_val_id: valId ? valId.slice(0, 100) : "",
    p_amount_minor: amount,
    p_status: target,
    p_payload: payload,
  });
  if (settleError) {
    if (/AMOUNT_MISMATCH|PAYMENT_NOT_FOUND/.test(settleError.message)) {
      reportError(settleError, { tranId });
      return done(payment.status);
    }
    throw new TransientCallbackError(settleError.message);
  }
  return done(settled?.status ?? payment.status);
}

/** Reads a form-encoded or query-string callback into plain fields. */
export async function readCallbackFields(request: Request): Promise<CallbackFields> {
  const url = new URL(request.url);
  const fromQuery = {
    tran_id: url.searchParams.get("tran_id"),
    val_id: url.searchParams.get("val_id"),
    status: url.searchParams.get("status"),
  };
  if (request.method !== "POST") return fromQuery;
  try {
    const form = await request.formData();
    const get = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : null;
    };
    return {
      tran_id: get("tran_id") ?? fromQuery.tran_id,
      val_id: get("val_id") ?? fromQuery.val_id,
      status: get("status") ?? fromQuery.status,
    };
  } catch {
    return fromQuery;
  }
}

/** Best-effort: which table does this transaction belong to (for the redirect). */
export async function lookupTable(
  tranIdRaw: string | null | undefined,
): Promise<{ token: string | null; tranId: string | null }> {
  const tranId = tranIdRaw?.trim() ?? "";
  if (!TRAN_ID.test(tranId)) return { token: null, tranId: null };
  try {
    const { data } = await getAdminSupabase()
      .from("payments")
      .select("table_sessions ( dining_tables ( qr_token ) )")
      .eq("tran_id", tranId)
      .maybeSingle();
    return { token: data?.table_sessions?.dining_tables?.qr_token ?? null, tranId };
  } catch {
    return { token: null, tranId };
  }
}
