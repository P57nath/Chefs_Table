import { Download, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { MoneyText } from "@/components/common/money-text";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { param } from "@/features/admin/date-range";
import { FilterField, FilterForm, filterInputClass, Pager } from "@/features/admin/list-controls";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ReviewButtons } from "@/features/admin/payments/review-buttons";
import {
  PAYMENT_CHANNELS,
  PAYMENT_COLUMNS,
  PAYMENT_STATUSES,
  parsePaymentFilters,
} from "@/features/admin/payments/query";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import type { Locale } from "@/i18n/config";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatClock, formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";

const PAGE = 50;

const STATUS_TONE: Record<string, string> = {
  paid: "bg-success/15 text-success",
  pending_review: "bg-ember/15 text-ember",
  initiated: "bg-muted text-muted-foreground",
  failed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
};

/** Payments with filters, managers' review of flagged online payments, CSV export (spec §7). */
export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/payments");
  if (!access.ok) return null;
  const t = await getTranslations("admin.payments");
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const f = parsePaymentFilters(sp);
  const page = Math.max(0, Number(param(sp.page) ?? 0) || 0);
  const supabase = await getServerSupabase();

  let query = supabase
    .from("payments")
    .select(PAYMENT_COLUMNS, { count: "exact" })
    .eq("restaurant_id", access.staff.restaurantId)
    .gte("created_at", f.range.start.toISOString())
    .lt("created_at", f.range.end.toISOString())
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (f.status) query = query.eq("status", f.status);
  if (f.channel) query = query.eq("channel", f.channel);
  let totals = supabase
    .from("payments")
    .select("amount_minor")
    .eq("restaurant_id", access.staff.restaurantId)
    .eq("status", "paid")
    .gte("created_at", f.range.start.toISOString())
    .lt("created_at", f.range.end.toISOString())
    .limit(10_000);
  if (f.channel) totals = totals.eq("channel", f.channel);
  const [list, paid, team] = await Promise.all([
    query,
    totals,
    supabase.from("staff_members").select("user_id, display_name"),
  ]);
  if (list.error) throw list.error;
  if (paid.error) throw paid.error;
  const names = new Map((team.data ?? []).map((m) => [m.user_id, m.display_name]));
  const paidTotal = paid.data.reduce((s, p) => s + p.amount_minor, 0);
  const qs = new URLSearchParams({ from: f.range.from, to: f.range.to });
  if (f.status) qs.set("status", f.status);
  if (f.channel) qs.set("channel", f.channel);

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="secondary">
            <a href={`/admin/payments/export?${qs}`} download>
              <Download aria-hidden />
              {t("exportCsv")}
            </a>
          </Button>
        }
      />
      <FilterForm action="/admin/payments" applyLabel={t("apply")} resetLabel={t("reset")}>
        <FilterField label={t("from")}>
          <input type="date" name="from" defaultValue={f.range.from} className={filterInputClass} />
        </FilterField>
        <FilterField label={t("to")}>
          <input type="date" name="to" defaultValue={f.range.to} className={filterInputClass} />
        </FilterField>
        <FilterField label={t("status")}>
          <select name="status" defaultValue={f.status ?? ""} className={filterInputClass}>
            <option value="">{t("any")}</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("channel")}>
          <select name="channel" defaultValue={f.channel ?? ""} className={filterInputClass}>
            <option value="">{t("any")}</option>
            {PAYMENT_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(`channel_${c}`)}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterForm>

      <p className="mb-4 text-sm">
        {t("paidTotal")}: <MoneyText minor={paidTotal} className="font-semibold" />
      </p>

      {list.data.length === 0 ? (
        <EmptyState icon={Wallet} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colWhen")}</th>
                <th className="px-4 py-3 font-medium">{t("colTable")}</th>
                <th className="px-4 py-3 font-medium">{t("channel")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium">{t("colRef")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.map((p) => (
                <tr key={p.id} data-payment={p.tran_id ?? p.id}>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(p.created_at, locale)} · {formatClock(p.created_at, locale)}
                  </td>
                  <td className="px-4 py-3">{p.table_sessions?.dining_tables?.label ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t(
                      `channel_${PAYMENT_CHANNELS.find((c) => c === p.channel) ?? (p.method === "cash" ? "cash" : "card")}`,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        STATUS_TONE[p.status],
                      )}
                    >
                      {t(`status_${p.status}`)}
                    </span>
                    {p.status === "pending_review" ? (
                      <div className="mt-2">
                        <ReviewButtons paymentId={p.id} />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.tran_id ?? (p.received_by ? names.get(p.received_by) : null) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <MoneyText minor={p.amount_minor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        base="/admin/payments"
        params={{ from: f.range.from, to: f.range.to, status: f.status, channel: f.channel }}
        page={page}
        pageSize={PAGE}
        total={list.count ?? 0}
        labels={{
          prev: t("prev"),
          next: t("next"),
          summary: t("summary", { count: list.count ?? 0 }),
        }}
      />
    </>
  );
}
