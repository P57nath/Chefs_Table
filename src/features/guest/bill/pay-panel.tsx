"use client";

import { Banknote, CreditCard, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { SegmentedControl } from "@/components/common/segmented-control";
import { Input } from "@/components/ui/input";
import { useCreateRequest } from "@/features/guest/tracker/use-guest-data";
import type { GuestRequest } from "@/features/guest/tracker/types";
import { asAppError } from "@/lib/errors";
import { formatMoney, toDecimalString } from "@/lib/money";
import { MIN_ONLINE_PAYMENT_MINOR, type PaymentChannel } from "@/lib/payments/types";
import { cn } from "@/lib/utils";

import { checkCustomAmount, type BillData } from "./bill-model";
import { useStartPayment } from "./use-bill-data";

const TILES: { channel: PaymentChannel; icon: LucideIcon }[] = [
  { channel: "bkash", icon: Smartphone },
  { channel: "nagad", icon: Wallet },
  { channel: "card", icon: CreditCard },
  { channel: "bank", icon: Landmark },
];

function Tile({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
  busy,
  className,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled: boolean;
  busy: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className={cn(
        "flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-left transition",
        "hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        busy && "animate-pulse border-primary",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary-text">
        <Icon className="size-5" aria-hidden />
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </button>
  );
}

/** Amount (full / custom split) + payment tiles (spec §4.6). */
export function PayPanel({ bill, openRequests }: { bill: BillData; openRequests: GuestRequest[] }) {
  const t = useTranslations("bill");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const start = useStartPayment();
  const cash = useCreateRequest();
  const [mode, setMode] = useState<"full" | "custom">("full");
  const [text, setText] = useState("");
  const [cashSent, setCashSent] = useState(false);

  const blocked = bill.unconfirmed_orders > 0;
  const custom = checkCustomAmount(text, bill.due_minor);
  const fullTooSmall = bill.due_minor < MIN_ONLINE_PAYMENT_MINOR;
  const amountOk = mode === "full" ? !fullTooSmall : custom.ok;
  const amount = mode === "custom" && custom.ok ? custom.minor : bill.due_minor;
  const busy = start.isPending || start.isSuccess; // success = navigating away
  const billRequested = cashSent || openRequests.some((r) => r.type === "request_bill");
  const error = start.error ? asAppError(start.error) : cash.error ? asAppError(cash.error) : null;

  function pay(channel: PaymentChannel) {
    start.mutate({
      channel,
      ...(mode === "custom" && custom.ok ? { amountMinor: custom.minor } : {}),
    });
  }
  async function payCash() {
    await cash.mutateAsync({ type: "request_bill", note: "Paying cash" });
    setCashSent(true);
  }

  return (
    <section aria-labelledby="pay-title" className="space-y-4">
      <h2 id="pay-title" className="font-display text-2xl font-semibold">
        {t("payTitle")}
      </h2>
      {blocked ? (
        <p role="status" className="rounded-2xl bg-muted p-4 text-sm">
          {t("blockedUnconfirmed")}
        </p>
      ) : null}

      <SegmentedControl<"full" | "custom">
        label={t("amountLabel")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "full", label: t("payFull", { amount: formatMoney(bill.due_minor, locale) }) },
          { value: "custom", label: t("payCustom") },
        ]}
      />
      {mode === "custom" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("customLabel")}</span>
          <Input
            inputMode="decimal"
            autoFocus
            value={text}
            placeholder={toDecimalString(Math.min(bill.due_minor, 50000))}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={!custom.ok && custom.reason !== "empty" ? true : undefined}
            aria-describedby="custom-hint"
            className="h-12 text-lg"
          />
          <span
            id="custom-hint"
            className={cn(
              "block text-sm",
              !custom.ok && custom.reason !== "empty" ? "text-ember" : "text-muted-foreground",
            )}
          >
            {!custom.ok && custom.reason !== "empty"
              ? t(`amount_${custom.reason}`, {
                  min: formatMoney(MIN_ONLINE_PAYMENT_MINOR, locale),
                  due: formatMoney(bill.due_minor, locale),
                })
              : t("customHint", { due: formatMoney(bill.due_minor, locale) })}
          </span>
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ channel, icon }) => (
          <Tile
            key={channel}
            icon={icon}
            label={t(`channel_${channel}`)}
            onClick={() => pay(channel)}
            disabled={blocked || !amountOk || busy}
            busy={busy && start.variables?.channel === channel}
          />
        ))}
        <Tile
          icon={Banknote}
          label={billRequested ? t("cashRequested") : t("channel_cash")}
          hint={billRequested ? undefined : t("cashHint")}
          onClick={payCash}
          disabled={billRequested || busy || cash.isPending}
          busy={cash.isPending}
          className="col-span-2 min-h-20 flex-row items-center justify-start"
        />
      </div>
      {mode === "full" && fullTooSmall && !blocked ? (
        <p className="text-sm text-muted-foreground">
          {t("amount_tooSmall", { min: formatMoney(MIN_ONLINE_PAYMENT_MINOR, locale), due: "" })}
        </p>
      ) : null}
      {amountOk && !blocked ? (
        <p className="text-center text-xs text-muted-foreground">
          {t("secureNote", { amount: formatMoney(amount, locale) })}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-3 text-sm">
          {tErr(error.key, error.params)}
        </p>
      ) : null}
    </section>
  );
}
