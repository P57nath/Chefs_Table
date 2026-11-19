import { ArrowRight, Armchair, ClipboardList, ShieldAlert, Star, Wallet } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { AdminPageHeader } from "@/features/admin/page-header";
import { requireStaff } from "@/features/auth/staff-server";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";
import { formatMoney } from "@/lib/money";
import { getServerSupabase } from "@/lib/supabase/server";
import { startOfDayDhaka } from "@/lib/time";

/** Today at a glance (full reports in Phase 9). */
export default async function AdminOverviewPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin");
  if (!access.ok) return null;
  const t = await getTranslations("admin.overview");
  const locale = (await getLocale()) as Locale;
  const supabase = await getServerSupabase();
  const from = startOfDayDhaka();
  const to = new Date(from.getTime() + 24 * 3600_000);

  const [report, tables, live, review] = await Promise.all([
    supabase.rpc("sales_report", { p_from: from.toISOString(), p_to: to.toISOString() }),
    supabase
      .from("dining_tables")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("table_sessions")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);
  if (report.error) throw report.error;
  const r = report.data as {
    revenue_minor: number;
    orders: number;
    avg_ticket_minor: number;
    avg_rating: number | null;
  };

  const tiles = [
    { icon: Wallet, label: t("revenue"), value: formatMoney(r.revenue_minor, locale) },
    { icon: ClipboardList, label: t("orders"), value: localizeDigits(r.orders, locale) },
    { icon: Wallet, label: t("avgTicket"), value: formatMoney(r.avg_ticket_minor, locale) },
    {
      icon: Armchair,
      label: t("occupancy"),
      value: `${localizeDigits(live.count ?? 0, locale)} / ${localizeDigits(tables.count ?? 0, locale)}`,
    },
    {
      icon: Star,
      label: t("rating"),
      value: r.avg_rating ? localizeDigits(Number(r.avg_rating).toFixed(1), locale) : "—",
    },
  ];

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
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
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-card p-5">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <tile.icon className="size-4" aria-hidden />
              {tile.label}
            </dt>
            <dd className="mt-2 font-display text-3xl font-semibold tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-10 mb-3 font-semibold">{t("quickLinks")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["/admin/menu", "linkMenu"],
            ["/admin/floor", "linkFloor"],
            ["/admin/qr", "linkQr"],
            ["/admin/staff", "linkStaff"],
          ] as const
        ).map(([href, key]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 font-medium outline-none hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t(key)}
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  );
}
