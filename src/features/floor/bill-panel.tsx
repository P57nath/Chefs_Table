"use client";

import { Banknote, CreditCard, DoorClosed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyText } from "@/components/common/money-text";
import { SegmentedControl } from "@/components/common/segmented-control";
import { SkeletonText } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { canUse, MANAGEMENT_ROLES } from "@/features/auth/roles";
import { useStaff } from "@/features/staff/staff-context";
import { formatBps, formatMoney, toDecimalString, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useBill, useCloseSession, useRecordCash } from "./floor-data";
import { SessionPayments } from "./session-payments";

interface BillPanelProps {
  sessionId: string;
  tableLabel: string;
  onClosed: () => void;
}

/** Bill summary, cash / card-machine payment, close table (spec §5.2). */
export function BillPanel({ sessionId, tableLabel, onClosed }: BillPanelProps) {
  const t = useTranslations("floor");
  const locale = useLocale();
  const { staff } = useStaff();
  const bill = useBill(sessionId);
  const record = useRecordCash();
  const close = useCloseSession();
  const [channel, setChannel] = useState<"cash" | "card">("cash");
  const [amountText, setAmountText] = useState<string | null>(null);
  const [forceOpen, setForceOpen] = useState(false);

  if (bill.isPending) return <SkeletonText lines={5} />;
  if (bill.isError || !bill.data) return <p className="text-sm text-ember">{t("billError")}</p>;
  const b = bill.data;
  const due = b.due_minor;
  // Default amount = due (re-derived after every payment while the field is untouched).
  const text = amountText ?? (due > 0 ? toDecimalString(due) : "");
  const amount = toMinor(text);
  const amountValid = amount !== null && amount > 0 && amount <= due;
  const canClose = due === 0 && b.unconfirmed_orders === 0;
  const isManager = canUse(staff.role, MANAGEMENT_ROLES);

  const row = (label: string, minor: number, strong = false) => (
    <div className={cn("flex items-baseline justify-between", strong && "text-lg font-medium")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <MoneyText minor={minor} />
    </div>
  );

  async function submit() {
    if (!amountValid || amount === null) return;
    await record.mutateAsync({ sessionId, amountMinor: amount, channel });
    toast.success(t("paymentRecorded", { amount: formatMoney(amount, locale), table: tableLabel }));
    setAmountText(null);
  }

  async function doClose(force: boolean) {
    await close.mutateAsync({ sessionId, force });
    toast.success(t("tableClosed", { table: tableLabel }));
    setForceOpen(false);
    onClosed();
  }

  return (
    <section aria-labelledby="bill-title" className="space-y-4">
      <h3 id="bill-title" className="font-medium">
        {t("bill")}
      </h3>
      <div className="space-y-1.5 rounded-2xl border border-border p-4">
        {row(t("subtotal"), b.subtotal_minor)}
        {row(`${t("service")} ${formatBps(b.service_charge_bps, locale)}`, b.service_charge_minor)}
        {row(`${t("vat")} ${formatBps(b.vat_bps, locale)}`, b.vat_minor)}
        <div className="my-2 border-t border-border" />
        {row(t("total"), b.total_minor, true)}
        {row(t("paid"), b.paid_minor)}
        <div className="flex items-baseline justify-between text-xl font-medium">
          <span>{t("due")}</span>
          <MoneyText minor={due} className={due > 0 ? "text-ember" : "text-success"} />
        </div>
        {b.unconfirmed_orders > 0 ? (
          <p className="pt-1 text-sm text-muted-foreground">
            {t("unconfirmedNote", { count: b.unconfirmed_orders })}
          </p>
        ) : null}
      </div>

      <SessionPayments sessionId={sessionId} />

      {due > 0 ? (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <p className="font-medium">{t("recordPayment")}</p>
          <SegmentedControl<"cash" | "card">
            label={t("recordPayment")}
            size="sm"
            value={channel}
            onChange={setChannel}
            options={[
              { value: "cash", label: t("channelCash"), icon: <Banknote aria-hidden /> },
              { value: "card", label: t("channelCard"), icon: <CreditCard aria-hidden /> },
            ]}
          />
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{t("amount")}</span>
            <Input
              inputMode="decimal"
              value={text}
              onChange={(e) => setAmountText(e.target.value)}
              aria-invalid={text !== "" && !amountValid ? true : undefined}
            />
          </label>
          {text !== "" && !amountValid ? (
            <p className="text-sm text-ember">{t("amountInvalid")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAmountText(toDecimalString(due))}
            >
              {t("exactDue")}
            </Button>
            {[50000, 100000]
              .filter((v) => v < due)
              .map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant="outline"
                  onClick={() => setAmountText(toDecimalString(v))}
                >
                  {formatMoney(v, locale)}
                </Button>
              ))}
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!amountValid}
            loading={record.isPending}
            onClick={submit}
          >
            {t("record", { amount: amount !== null ? formatMoney(amount, locale) : "" })}
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          variant={canClose ? "default" : "secondary"}
          disabled={!canClose}
          loading={close.isPending && !forceOpen}
          onClick={() => doClose(false)}
        >
          <DoorClosed aria-hidden />
          {t("closeTable")}
        </Button>
        {!canClose ? (
          <p className="text-center text-sm text-muted-foreground">{t("closeHint")}</p>
        ) : null}
        {!canClose && isManager ? (
          <Button
            size="sm"
            variant="destructive-soft"
            className="w-full"
            onClick={() => setForceOpen(true)}
          >
            {t("forceClose")}
          </Button>
        ) : null}
      </div>

      <Dialog open={forceOpen} onOpenChange={setForceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forceCloseTitle", { table: tableLabel })}</DialogTitle>
            <DialogDescription>
              {t("forceCloseBody", { amount: formatMoney(due, locale) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{t("keepOpen")}</Button>
            </DialogClose>
            <Button variant="destructive" loading={close.isPending} onClick={() => doClose(true)}>
              {t("closeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
