"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

import { BarList } from "./bar-list";
import { ChartCard, DataTable } from "./chart-card";
import { ColumnChart } from "./column-chart";
import { LineChart } from "./line-chart";
import { hours24, paymentSplit, type DailyPoint, type SalesReport } from "./model";

const METHODS = ["cash", "card", "bkash", "nagad", "bank", "rocket"] as const;

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** The four charts of the dashboard; every one has a table twin. */
export function DashboardCharts({
  report,
  daily,
}: {
  report: SalesReport;
  daily: DailyPoint[] | null;
}) {
  const t = useTranslations("admin.reports");
  const locale = useLocale() as Locale;
  const money = (v: number) => formatMoney(v, locale);
  const n = (v: number) => localizeDigits(v, locale);
  const none = report.orders === 0 && report.revenue_minor === 0 ? t("noSales") : null;
  const hours = hours24(report.by_hour);
  const split = paymentSplit(report.by_method);
  const methodLabel = (key: string) => {
    const known = METHODS.find((m) => m === key);
    return known ? t(`method_${known}`) : key;
  };
  const dayLabel = (d: string) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${d}T00:00:00Z`));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {daily ? (
        <div className="xl:col-span-2">
          <ChartCard
            title={t("revenueByDay")}
            subtitle={t("revenueByDayHint")}
            empty={none}
            table={
              <DataTable
                head={[t("day"), t("revenue"), t("orders")]}
                rows={daily.map((d) => [dayLabel(d.day), money(d.revenue_minor), n(d.orders)])}
              />
            }
          >
            <LineChart
              data={daily.map((d) => ({
                key: d.day,
                label: dayLabel(d.day),
                value: d.revenue_minor,
              }))}
              format={money}
              tick={(v) => formatMoneyCompact(v, locale)}
              labelEvery={Math.ceil(daily.length / 8)}
              ariaLabel={t("revenueByDayAria", { count: daily.length })}
            />
          </ChartCard>
        </div>
      ) : null}

      <ChartCard
        title={t("ordersByHour")}
        subtitle={t("ordersByHourHint")}
        empty={report.orders === 0 ? t("noSales") : null}
        table={
          <DataTable
            head={[t("hour"), t("orders")]}
            rows={hours.filter((h) => h.orders > 0).map((h) => [hourLabel(h.hour), n(h.orders)])}
          />
        }
      >
        <ColumnChart
          data={hours.map((h) => ({
            key: String(h.hour),
            label: hourLabel(h.hour),
            value: h.orders,
          }))}
          format={(v) => t("ordersCount", { count: v })}
          tick={n}
          labelEvery={3}
          ariaLabel={t("ordersByHourAria")}
        />
      </ChartCard>

      <ChartCard
        title={t("paymentSplit")}
        subtitle={t("paymentSplitHint")}
        empty={split.length === 0 ? t("noPayments") : null}
        table={
          <DataTable
            head={[t("method"), t("amount"), t("share")]}
            rows={split.map((s) => [methodLabel(s.key), money(s.amount), `${n(s.share)}%`])}
          />
        }
      >
        <BarList
          label={t("paymentSplit")}
          rows={split.map((s) => ({
            key: s.key,
            name: methodLabel(s.key),
            value: s.amount,
            display: `${formatMoneyCompact(s.amount, locale)} · ${n(s.share)}%`,
          }))}
        />
      </ChartCard>

      <div className="xl:col-span-2">
        <ChartCard
          title={t("topItems")}
          subtitle={t("topItemsHint")}
          empty={report.top_items.length === 0 ? t("noSales") : null}
          table={
            <DataTable
              head={[t("dish"), t("sold"), t("revenue")]}
              rows={report.top_items.map((i) => [i.name, n(i.qty), money(i.revenue_minor)])}
            />
          }
        >
          <BarList
            label={t("topItems")}
            rows={report.top_items.map((i) => ({
              key: i.name,
              name: i.name,
              value: i.qty,
              display: t("soldCount", { count: i.qty }),
            }))}
          />
        </ChartCard>
      </div>
    </div>
  );
}
