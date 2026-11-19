"use server";

import { z } from "@/lib/zod";

import { MANAGEMENT_ROLES, canUse } from "@/features/auth/roles";
import { getCurrentStaff } from "@/features/auth/staff-server";
import { toAppError, type ErrorKey } from "@/lib/errors";
import { getServerSupabase } from "@/lib/supabase/server";

const input = z.object({ paymentId: z.uuid(), approve: z.boolean() });

export type ReviewResult = { ok: true; status: string } | { ok: false; error: ErrorKey };

/**
 * Owner / manager approves or rejects an online payment parked for review.
 * Role is checked here and again in Postgres (review_gateway_payment).
 */
export async function reviewPaymentAction(raw: unknown): Promise<ReviewResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "unknown" };
  const staff = await getCurrentStaff();
  if (!staff || staff === "not-staff" || !staff.isActive || !canUse(staff.role, MANAGEMENT_ROLES)) {
    return { ok: false, error: "forbidden" };
  }
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("review_gateway_payment", {
    p_payment_id: parsed.data.paymentId,
    p_approve: parsed.data.approve,
  });
  if (error) return { ok: false, error: toAppError(error).key };
  return { ok: true, status: data?.status ?? "" };
}
