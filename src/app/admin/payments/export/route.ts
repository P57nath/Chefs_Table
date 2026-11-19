import { NextResponse, type NextRequest } from "next/server";

import { toCsv } from "@/features/admin/csv";
import { PAYMENT_COLUMNS, parsePaymentFilters } from "@/features/admin/payments/query";
import { MANAGEMENT_ROLES, canUse } from "@/features/auth/roles";
import { getCurrentStaff } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { toDecimalString } from "@/lib/money";

/** CSV of payments for the current filters (owner/manager; RLS applies too). */
export async function GET(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!staff || staff === "not-staff" || !staff.isActive || !canUse(staff.role, MANAGEMENT_ROLES)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const f = parsePaymentFilters(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await getServerSupabase();
  let query = supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("restaurant_id", staff.restaurantId)
    .gte("created_at", f.range.start.toISOString())
    .lt("created_at", f.range.end.toISOString())
    .order("created_at", { ascending: true })
    .limit(50_000);
  if (f.status) query = query.eq("status", f.status);
  if (f.channel) query = query.eq("channel", f.channel);
  const [{ data, error }, team] = await Promise.all([
    query,
    supabase.from("staff_members").select("user_id, display_name"),
  ]);
  if (error) return new NextResponse("Export failed", { status: 500 });
  const names = new Map((team.data ?? []).map((m) => [m.user_id, m.display_name]));

  const csv = toCsv(
    [
      "created_at",
      "paid_at",
      "table",
      "method",
      "channel",
      "status",
      "amount_bdt",
      "tran_id",
      "received_by",
    ],
    data.map((p) => [
      p.created_at,
      p.paid_at,
      p.table_sessions?.dining_tables?.label ?? "",
      p.method,
      p.channel,
      p.status,
      toDecimalString(p.amount_minor),
      p.tran_id,
      p.received_by ? (names.get(p.received_by) ?? "") : "",
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${f.range.from}_${f.range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
