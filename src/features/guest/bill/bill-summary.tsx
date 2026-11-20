"use client";

import { Hourglass } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";
import { localizeDigits } from "@/lib/digits";
import { formatBps } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { BillData, BillLine } from "./bill-model";

function LineRow({ line, muted }: { line: BillLine; muted?: boolean }) {
  const locale = useLocale();
  const { item } = line;
  const name =
    locale === "bn" && item.menu_items?.name_bn ? item.menu_items.name_bn : item.name_snapshot;
  const mods = item.modifiers.map((m) => (locale === "bn" && m.name_bn ? m.name_bn : m.name));
  return (
    <li className={cn("flex gap-3 text-sm", muted && "text-muted-foreground")}>
      <span className="w-7 shrink-0 font-medium tabular-nums">
        {localizeDigits(item.quantity, locale)}×
      </span>
      <span className="min-w-0 flex-1">
        {name}
        {mods.length ? (
          <span className="block text-muted-foreground">{mods.join(" · ")}</span>
        ) : null}
      </span>
      <MoneyText minor={item.line_total_minor} className="tabular-nums" />
    </li>
  );
}

/** Itemised bill + totals from session_bill (spec §4.6). */
export function BillSummary({
  bill,
  billed,
  waiting,
}: {
  bill: BillData;
  billed: BillLine[];
  waiting: BillLine[];
}) {
  const t = useTranslations("bill");
  const locale = useLocale();
  const row = (label: string, minor: number) => (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <MoneyText minor={minor} />
    </div>
  );

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="bill-items"
        className="space-y-4 rounded-3xl border border-border bg-card p-5"
      >
        <h2 id="bill-items" className="sr-only">
          {t("itemsTitle")}
        </h2>
        <ul className="space-y-2.5">
          {billed.map((l) => (
            <LineRow key={l.id} line={l} />
          ))}
        </ul>
        <div className="space-y-1.5 border-t border-dashed border-border pt-4">
          {row(t("subtotal"), bill.subtotal_minor)}
          {row(
            `${t("service")} ${formatBps(bill.service_charge_bps, locale)}`,
            bill.service_charge_minor,
          )}
          {row(`${t("vat")} ${formatBps(bill.vat_bps, locale)}`, bill.vat_minor)}
        </div>
        <div className="space-y-1.5 border-t border-border pt-4">
          <div className="flex items-baseline justify-between text-lg font-medium">
            <span>{t("total")}</span>
            <MoneyText minor={bill.total_minor} />
          </div>
          {bill.paid_minor > 0 ? row(t("paid"), bill.paid_minor) : null}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-display text-2xl font-medium">{t("due")}</span>
            <MoneyText
              minor={bill.due_minor}
              data-testid="bill-due"
              className={cn(
                "font-display text-3xl font-medium",
                bill.due_minor > 0 ? "text-primary-text" : "text-success",
              )}
            />
          </div>
        </div>
      </section>

      {waiting.length > 0 ? (
        <section
          aria-labelledby="bill-waiting"
          className="space-y-3 rounded-3xl border border-dashed border-border p-5"
        >
          <h2 id="bill-waiting" className="flex items-center gap-2 font-medium">
            <Hourglass className="size-4 text-primary-text" aria-hidden />
            {t("waitingTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("waitingBody")}</p>
          <ul className="space-y-2">
            {waiting.map((l) => (
              <LineRow key={l.id} line={l} muted />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
