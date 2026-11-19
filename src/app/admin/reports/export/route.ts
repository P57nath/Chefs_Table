import { NextResponse, type NextRequest } from "next/server";

import { toCsv } from "@/features/admin/csv";
import { parseDayRange } from "@/features/admin/date-range";
import {
  hours24,
  normaliseReport,
  paymentSplit,
  type DailyPoint,
} from "@/features/admin/reports/model";
import { MANAGEMENT_ROLES, canUse } from "@/features/auth/roles";
import { getCurrentStaff } from "@/features/auth/staff-server";
import { toDecimalString } from "@/lib/money";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Report CSV for a Dhaka day range: one file, a `section` column per block
 * (summary, by day, by hour, payment split, top items). Amounts in BDT.
 */
export async function GET(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!staff || staff === "not-staff" || !staff.isActive || !canUse(staff.role, MANAGEMENT_ROLES)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const sp = request.nextUrl.searchParams;
  const range = parseDayRange(sp.get("from") ?? undefined, sp.get("to") ?? undefined, 1);
  const supabase = await getServerSupabase();
  const args = { p_from: range.start.toISOString(), p_to: range.end.toISOString() };
  const [report, daily] = await Promise.all([
    supabase.rpc("sales_report", args),
    supabase.rpc("sales_daily", args),
  ]);
  if (report.error || daily.error) return new NextResponse("Export failed", { status: 500 });
  const r = normaliseReport(report.data);
  const bdt = (minor: number) => toDecimalString(minor);

  const rows: (string | number | null)[][] = [
    ["summary", "revenue_bdt", bdt(r.revenue_minor), null],
    ["summary", "orders", r.orders, null],
    ["summary", "avg_order_bdt", bdt(r.avg_ticket_minor), null],
    ["summary", "avg_confirm_seconds", r.avg_confirm_seconds, null],
    ["summary", "avg_kitchen_seconds", r.avg_kitchen_seconds, null],
    ["summary", "avg_rating", r.avg_rating ?? "", null],
    ...((daily.data ?? []) as unknown as DailyPoint[]).map((d) => [
      "by_day",
      d.day,
      bdt(Number(d.revenue_minor)),
      Number(d.orders),
    ]),
    ...hours24(r.by_hour).map((h) => [
      "by_hour",
      `${String(h.hour).padStart(2, "0")}:00`,
      h.orders,
      null,
    ]),
    ...paymentSplit(r.by_method).map((s) => ["payment_split", s.key, bdt(s.amount), `${s.share}%`]),
    ...r.top_items.map((i) => ["top_items", i.name, i.qty, bdt(i.revenue_minor)]),
  ];
  const csv = toCsv(["section", "key", "value", "extra"], rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${range.from}_${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
