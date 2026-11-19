"use client";

import { CircleCheck, CircleX, Clock3, Hourglass, Undo2, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { MoneyText } from "@/components/common/money-text";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { useGuestSession } from "@/features/guest/session/guest-session";
import { GuestPageHeader } from "@/features/guest/session/page-header";
import { asAppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

import { resultView, type ResultView } from "./result-model";
import { usePayment } from "./use-bill-data";

export const CONFIRM_WINDOW_MS = 30_000;

const LOOK: Record<ResultView, { icon: LucideIcon; tone: string }> = {
  paid: { icon: CircleCheck, tone: "bg-success/15 text-success" },
  reviewing: { icon: Clock3, tone: "bg-primary/12 text-primary-text" },
  confirming: { icon: Hourglass, tone: "bg-primary/12 text-primary-text" },
  confirmingLong: { icon: Hourglass, tone: "bg-primary/12 text-primary-text" },
  failed: { icon: CircleX, tone: "bg-ember/15 text-ember" },
  cancelled: { icon: Undo2, tone: "bg-muted text-muted-foreground" },
  notFound: { icon: CircleX, tone: "bg-muted text-muted-foreground" },
};

/** `/t/[token]/payment/result`: waits for the IPN (≤ 30 s), then shows the outcome. */
export function PaymentResultScreen({
  status,
  tran,
}: {
  status: "success" | "fail" | "cancel";
  tran: string | null;
}) {
  const t = useTranslations("payment");
  const reduce = useReducedMotion();
  const { token, phase } = useGuestSession();
  const [timedOut, setTimedOut] = useState(false);
  const payment = usePayment(tran, !timedOut);
  const base = `/t/${encodeURIComponent(token)}`;

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(id);
  }, []);

  let body: React.ReactNode;
  if (phase === "joining" || (payment.isPending && payment.fetchStatus !== "idle")) {
    body = <SkeletonCard />;
  } else if (payment.isError) {
    body = (
      <ErrorState
        title={t("errorTitle")}
        variant={asAppError(payment.error).network ? "offline" : "error"}
        onRetry={() => void payment.refetch()}
        retrying={payment.isFetching}
      />
    );
  } else {
    const view = resultView(status, payment.data ?? null, timedOut);
    const { icon: Icon, tone } = LOOK[view];
    const waiting = view === "confirming";
    body = (
      <section className="flex flex-col items-center gap-5 pt-10 text-center">
        <motion.div
          className={cn("grid size-24 place-items-center rounded-full", tone)}
          initial={reduce ? false : { scale: 0.7, opacity: 0 }}
          animate={
            waiting && !reduce ? { scale: [1, 1.06, 1], opacity: 1 } : { scale: 1, opacity: 1 }
          }
          transition={
            waiting ? { repeat: Infinity, duration: 1.6 } : { type: "spring", damping: 12 }
          }
        >
          <Icon className="size-11" aria-hidden />
        </motion.div>
        <div aria-live="polite" className="max-w-sm space-y-2">
          <h2 className="font-display text-3xl font-semibold">{t(`${view}Title`)}</h2>
          <p className="text-muted-foreground">{t(`${view}Body`)}</p>
        </div>
        {payment.data ? (
          <MoneyText
            minor={payment.data.amount_minor}
            className="font-display text-4xl font-semibold"
          />
        ) : null}
        <div className="flex w-full max-w-sm flex-col gap-2 pt-2">
          <Button asChild size="lg">
            <Link href={`${base}/bill`}>
              {view === "failed" || view === "cancelled" ? t("tryAgain") : t("viewBill")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href={`${base}/track`}>{t("backToOrders")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      <GuestPageHeader title={t("title")} backHref={`${base}/bill`} backLabel={t("backToBill")} />
      <main id="main" className="mx-auto max-w-xl px-4 pt-4">
        {body}
      </main>
    </div>
  );
}
