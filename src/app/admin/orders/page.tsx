import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { MoneyText } from "@/components/common/money-text";
import { StatusPill } from "@/components/common/status-pill";
import { EmptyState } from "@/components/states/empty-state";
import { param, parseDayRange } from "@/features/admin/date-range";
import { FilterField, FilterForm, filterInputClass, Pager } from "@/features/admin/list-controls";
import { AdminPageHeader } from "@/features/admin/page-header";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/status";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatClock, formatDate } from "@/lib/time";

const PAGE = 50;

/** Searchable order history (spec §7): date range, table, status, order number. */
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/orders");
  if (!access.ok) return null;
  const t = await getTranslations("admin.orders");
  const tStatus = await getTranslations("orderStatus");
  const locale = (await getLocale()) as Locale;
  const sp = await searchParams;
  const range = parseDayRange(param(sp.from), param(sp.to));
  const status = ORDER_STATUSES.find((s) => s === param(sp.status));
  const table = param(sp.table);
  const q = param(sp.q)?.trim();
  const orderNo = q && /^\d{1,12}$/.test(q) ? Number(q) : null;
  const page = Math.max(0, Number(param(sp.page) ?? 0) || 0);

  const supabase = await getServerSupabase();
  let query = supabase
    .from("orders")
    .select(
      "id, order_no, status, placed_at, subtotal_minor, dining_tables ( label ), order_items ( quantity )",
      {
        count: "exact",
      },
    )
    .eq("restaurant_id", access.staff.restaurantId)
    .gte("placed_at", range.start.toISOString())
    .lt("placed_at", range.end.toISOString())
    .order("placed_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (status) query = query.eq("status", status);
  if (table) query = query.eq("table_id", table);
  if (orderNo !== null) query = query.eq("order_no", orderNo);
  const [orders, tables] = await Promise.all([
    query,
    supabase
      .from("dining_tables")
      .select("id, label")
      .eq("restaurant_id", access.staff.restaurantId)
      .order("label"),
  ]);
  if (orders.error) throw orders.error;
  if (tables.error) throw tables.error;
  const total = orders.count ?? 0;
  const tableOptions = [...tables.data].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <FilterForm action="/admin/orders" applyLabel={t("apply")} resetLabel={t("reset")}>
        <FilterField label={t("from")}>
          <input type="date" name="from" defaultValue={range.from} className={filterInputClass} />
        </FilterField>
        <FilterField label={t("to")}>
          <input type="date" name="to" defaultValue={range.to} className={filterInputClass} />
        </FilterField>
        <FilterField label={t("table")}>
          <select name="table" defaultValue={table ?? ""} className={filterInputClass}>
            <option value="">{t("any")}</option>
            {tableOptions.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("status")}>
          <select name="status" defaultValue={status ?? ""} className={filterInputClass}>
            <option value="">{t("any")}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatus(s)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("orderNo")}>
          <input
            name="q"
            inputMode="numeric"
            defaultValue={q ?? ""}
            placeholder="#"
            className={filterInputClass}
          />
        </FilterField>
      </FilterForm>

      {orders.data.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("colOrder")}</th>
                <th className="px-4 py-3 font-medium">{t("colWhen")}</th>
                <th className="px-4 py-3 font-medium">{t("colTable")}</th>
                <th className="px-4 py-3 font-medium">{t("colItems")}</th>
                <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("colSubtotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.data.map((o) => (
                <tr key={o.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      #{localizeDigits(o.order_no, locale)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(o.placed_at, locale)} · {formatClock(o.placed_at, locale)}
                  </td>
                  <td className="px-4 py-3">{o.dining_tables?.label ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {localizeDigits(
                      o.order_items.reduce((n, i) => n + i.quantity, 0),
                      locale,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill kind="order" state={o.status as OrderStatus} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyText minor={o.subtotal_minor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        base="/admin/orders"
        params={{ from: range.from, to: range.to, table, status, q }}
        page={page}
        pageSize={PAGE}
        total={total}
        labels={{ prev: t("prev"), next: t("next"), summary: t("summary", { count: total }) }}
      />
    </>
  );
}
