import "server-only";

import { MANAGEMENT_ROLES, canUse } from "@/features/auth/roles";
import { getCurrentStaff, type StaffUser } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Result every admin server action returns (never throws to the client). */
export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

export class ActionError extends Error {}

/**
 * Re-checks on the server that the caller is an active owner/manager
 * (never trust hidden UI). RLS checks the same thing again on every write.
 */
export async function requireManager(): Promise<{
  staff: StaffUser;
  supabase: Awaited<ReturnType<typeof getServerSupabase>>;
}> {
  const staff = await getCurrentStaff();
  if (!staff || staff === "not-staff" || !staff.isActive || !canUse(staff.role, MANAGEMENT_ROLES)) {
    throw new ActionError("FORBIDDEN");
  }
  return { staff, supabase: await getServerSupabase() };
}

/** Maps thrown errors (ours, Zod, Postgres) to a stable code for the UI. */
export function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message };
  if (err && typeof err === "object" && "issues" in err)
    return { ok: false, error: "INVALID_INPUT" };
  const pg = err as { code?: string; message?: string } | null;
  if (pg?.code === "23505") return { ok: false, error: "DUPLICATE" };
  if (pg?.code === "23503") return { ok: false, error: "IN_USE" };
  if (pg?.code === "42501") return { ok: false, error: "FORBIDDEN" };
  if (pg?.code === "23514") return { ok: false, error: "INVALID_INPUT" };
  console.error("[admin action]", err);
  return { ok: false, error: "UNKNOWN" };
}
