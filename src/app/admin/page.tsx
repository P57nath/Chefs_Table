import { ArrowRight, Download, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { param } from "@/features/admin/date-range";
import { AdminPageHeader } from "@/features/admin/page-header";
import { DashboardCharts } from "@/features/admin/reports/dashboard-charts";
import { Kpi } from "@/features/admin/reports/kpi";
import {
  delta,
  formatDuration,
  normaliseReport,
  reportRange,
  type DailyPoint,
} from "@/features/admin/reports/model";
import { RangePicker } from "@/features/admin/reports/range-picker";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";
import { formatMoney } from "@/lib/money";
import { getServerSupabase } from "@/lib/supabase/server";

/** Dashboard (spec §7): KPIs vs the previous period and charts, in Dhaka days. */
export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin");
  if (!access.ok) return null;
  const t = await getTranslations("admin.reports");
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const { preset, current, previous, days } = reportRange({
    range: param(sp.range),
    from: param(sp.from),
    to: param(sp.to),
  });
  const supabase = await getServerSupabase();
  const iso = (d: Date) => d.toISOString();

  const [now, prev, daily, tables, live, review] = await Promise.all([
    supabase.rpc("sales_report", { p_from: iso(current.start), p_to: iso(current.end) }),
    supabase.rpc("sales_report", { p_from: iso(previous.start), p_to: iso(previous.end) }),
    days > 1
      ? supabase.rpc("sales_daily", { p_from: iso(current.start), p_to: iso(current.end) })
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("dining_tables")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("table_sessions")
      .select("id, dining_tables!inner ( is_active )", { count: "exact", head: true })
      .neq("status", "closed")
      .eq("dining_tables.is_active", true),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);
  if (now.error) throw now.error;
  if (prev.error) throw prev.error;
  if (daily.error) throw daily.error;
  const r = normaliseReport(now.data);
  const p = normaliseReport(prev.data);
  const series = daily.data
    ? (daily.data as unknown as DailyPoint[]).map((d) => ({
        day: d.day,
        revenue_minor: Number(d.revenue_minor),
        orders: Number(d.orders),
      }))
    : null;

  const versus = preset === "today" ? t("vsYesterday") : t("vsPrevious", { count: days });
  const change = (cur: number, before: number) => {
    const d = delta(cur, before);
    return {
      delta: d,
      deltaText:
        d === null
          ? t("noComparison")
          : `${d > 0 ? "+" : ""}${localizeDigits(d, locale)}% ${versus}`,
    };
  };
  const rangeText =
    current.from === current.to
      ? current.from
      : t("rangeText", { from: current.from, to: current.to });
  const exportHref = `/admin/reports/export?from=${current.from}&to=${current.to}`;

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description", { range: rangeText })}
        actions={
          <Button asChild variant="secondary">
            <a href={exportHref} download>
              <Download aria-hidden />
              {t("exportCsv")}
            </a>
          </Button>
        }
      />
      <RangePicker preset={preset} from={current.from} to={current.to} />

      {(review.count ?? 0) > 0 ? (
        <Link
          href="/admin/payments?status=pending_review"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-ember/40 bg-ember/10 p-4 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ShieldAlert className="size-5 text-ember" aria-hidden />
          <span className="flex-1">{t("toReview", { count: review.count ?? 0 })}</span>
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      ) : null}

      <dl className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          hero
          label={t("revenue")}
          value={formatMoney(r.revenue_minor, locale)}
          {...change(r.revenue_minor, p.revenue_minor)}
        />
        <Kpi
          label={t("orders")}
          value={localizeDigits(r.orders, locale)}
          {...change(r.orders, p.orders)}
        />
        <Kpi
          label={t("avgTicket")}
          value={formatMoney(r.avg_ticket_minor, locale)}
          {...change(r.avg_ticket_minor, p.avg_ticket_minor)}
        />
        <Kpi
          label={t("avgConfirm")}
          value={r.avg_confirm_seconds ? formatDuration(r.avg_confirm_seconds) : "—"}
          upIsGood={false}
          {...change(r.avg_confirm_seconds, p.avg_confirm_seconds)}
        />
        <Kpi
          label={t("avgKitchen")}
          value={r.avg_kitchen_seconds ? formatDuration(r.avg_kitchen_seconds) : "—"}
          upIsGood={false}
          {...change(r.avg_kitchen_seconds, p.avg_kitchen_seconds)}
        />
        <Kpi
          label={t("rating")}
          value={
            r.avg_rating
              ? `${localizeDigits(r.avg_rating.toFixed(1), locale)} / ${localizeDigits(5, locale)}`
              : "—"
          }
          note={r.avg_rating ? undefined : t("noRatings")}
        />
        <Kpi
          label={t("occupancy")}
          value={`${localizeDigits(live.count ?? 0, locale)} / ${localizeDigits(tables.count ?? 0, locale)}`}
          note={t("occupancyNote")}
        />
      </dl>

      <DashboardCharts report={r} daily={series} />
    </>
  );
}
