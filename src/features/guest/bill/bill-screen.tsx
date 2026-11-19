"use client";

import { Clock3, Receipt } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonBlock, SkeletonCard } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { GuestPageHeader } from "@/features/guest/session/page-header";
import { useGuestSession } from "@/features/guest/session/guest-session";
import { useSessionOrders, useSessionRequests } from "@/features/guest/tracker/use-guest-data";
import { asAppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";

import { inFlight, isSettled, splitBillLines } from "./bill-model";
import { BillSummary } from "./bill-summary";
import { FeedbackCard } from "./feedback-card";
import { PaidCelebration } from "./paid-celebration";
import { PayPanel } from "./pay-panel";
import { useGuestBill, useSessionPayments } from "./use-bill-data";

/** `/t/[token]/bill`: itemised bill, split payment, tiles, feedback when settled. */
export function BillScreen() {
  const t = useTranslations("bill");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { token, phase } = useGuestSession();
  const bill = useGuestBill();
  const orders = useSessionOrders();
  const payments = useSessionPayments();
  const requests = useSessionRequests();
  const base = `/t/${encodeURIComponent(token)}`;

  let body: React.ReactNode;
  if (phase === "joining" || bill.isPending || orders.isPending) {
    body = (
      <div role="status" aria-label={tCommon("loading")} className="space-y-4">
        <SkeletonCard />
        <SkeletonBlock className="h-40 w-full rounded-3xl" />
      </div>
    );
  } else if (bill.isError || orders.isError) {
    const err = bill.error ?? orders.error;
    body = (
      <ErrorState
        title={t("errorTitle")}
        variant={asAppError(err).network ? "offline" : "error"}
        onRetry={() => {
          void bill.refetch();
          void orders.refetch();
        }}
        retrying={bill.isFetching || orders.isFetching}
      />
    );
  } else {
    const b = bill.data;
    const { billed, waiting } = splitBillLines(orders.data);
    const reviewing = inFlight(payments.data ?? []);
    if (billed.length === 0 && waiting.length === 0) {
      body = (
        <EmptyState
          icon={Receipt}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Button asChild>
              <Link href={base}>{t("backToMenu")}</Link>
            </Button>
          }
        />
      );
    } else {
      body = (
        <div className="space-y-6">
          {isSettled(b) ? <PaidCelebration /> : null}
          <BillSummary bill={b} billed={billed} waiting={waiting} />
          {reviewing.length > 0 ? (
            <p role="status" className="flex gap-3 rounded-2xl bg-muted p-4 text-sm">
              <Clock3 className="size-5 shrink-0 text-primary-text" aria-hidden />
              {t("reviewing", {
                amount: formatMoney(
                  reviewing.reduce((s, p) => s + p.amount_minor, 0),
                  locale,
                ),
              })}
            </p>
          ) : null}
          {b.due_minor > 0 ? <PayPanel bill={b} openRequests={requests.data ?? []} /> : null}
          {isSettled(b) ? <FeedbackCard /> : null}
        </div>
      );
    }
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <GuestPageHeader
        title={t("title")}
        backHref={`${base}/track`}
        backLabel={t("backToOrders")}
      />
      <main id="main" className="mx-auto max-w-xl px-4 pt-4">
        {body}
      </main>
    </div>
  );
}
