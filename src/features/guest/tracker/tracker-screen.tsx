"use client";

import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { LanguageToggle } from "@/components/common/language-toggle";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonBlock, SkeletonCard } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { useGuestSession } from "@/features/guest/session/guest-session";
import { asAppError } from "@/lib/errors";

import { ActionBar } from "./action-bar";
import { CallWaiterSheet } from "./call-waiter-sheet";
import { OrderCard } from "./order-card";
import { StagePanel } from "./stage-panel";
import { focusOrder } from "./tracker-model";
import { useSessionOrders, useSessionRequests } from "./use-guest-data";
import { useStatusAlerts } from "./use-status-alerts";

export function TrackerScreen() {
  const t = useTranslations("guest");
  const tCommon = useTranslations("common");
  const { token, table, phase } = useGuestSession();
  const orders = useSessionOrders();
  const requests = useSessionRequests();
  const announcement = useStatusAlerts(orders.data);
  const [callOpen, setCallOpen] = useState(false);
  const menuHref = `/t/${encodeURIComponent(token)}`;
  const focus = orders.data ? focusOrder(orders.data) : null;

  let body: React.ReactNode;
  if (phase === "joining" || (orders.isPending && orders.fetchStatus !== "idle")) {
    body = (
      <div role="status" aria-label={tCommon("loading")} className="space-y-4">
        <SkeletonBlock className="aspect-[360/220] w-full rounded-3xl" />
        <SkeletonCard />
      </div>
    );
  } else if (orders.isError) {
    body = (
      <ErrorState
        title={t("ordersErrorTitle")}
        variant={asAppError(orders.error).network ? "offline" : "error"}
        onRetry={() => void orders.refetch()}
        retrying={orders.isFetching}
      />
    );
  } else if (!orders.data || orders.data.length === 0 || !focus) {
    body = (
      <EmptyState
        icon={Receipt}
        title={t("noOrdersTitle")}
        body={t("noOrdersBody")}
        action={
          <Button asChild>
            <Link href={menuHref}>{t("backToMenu")}</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="space-y-4">
        <StagePanel order={focus} />
        <ol className="space-y-3">
          {orders.data.map((o, i) => (
            <li key={o.id}>
              <OrderCard order={o} round={i + 1} />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-32">
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <IconButton label={t("backToMenu")} asChild>
            <Link href={menuHref}>
              <ArrowLeft aria-hidden />
            </Link>
          </IconButton>
          <h1 className="flex-1 truncate font-display text-xl font-semibold">{t("trackTitle")}</h1>
          <span className="rounded-full bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground">
            {table.table_label}
          </span>
          <LanguageToggle />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pt-4">
        {body}
      </main>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ActionBar
        menuHref={menuHref}
        openRequests={requests.data ?? []}
        onCallWaiter={() => setCallOpen(true)}
      />
      <CallWaiterSheet
        open={callOpen}
        onOpenChange={setCallOpen}
        openRequests={requests.data ?? []}
      />
    </div>
  );
}
