"use client";

import { Hand, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import type { GuestRequest } from "./types";

interface ActionBarProps {
  menuHref: string;
  openRequests: GuestRequest[];
  onCallWaiter: () => void;
}

/** Call waiter · Order more · Bill & pay. */
export function ActionBar({ menuHref, openRequests, onCallWaiter }: ActionBarProps) {
  const t = useTranslations("guest");
  const billOpen = openRequests.some((r) => r.type === "request_bill");
  const callOpen = openRequests.some((r) => r.type !== "request_bill");

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4">
      <div className="bar-surface pointer-events-auto mx-auto grid max-w-3xl grid-cols-3 gap-2 rounded-2xl border border-border p-2 shadow-float">
        <Button
          variant={callOpen ? "secondary" : "ghost"}
          className="h-14 flex-col gap-0.5 text-xs"
          onClick={onCallWaiter}
        >
          <Hand className="size-5" aria-hidden />
          {t("callWaiter")}
        </Button>
        <Button asChild className="h-14 flex-col gap-0.5 text-xs">
          <Link href={menuHref}>
            <Plus className="size-5" aria-hidden />
            {t("orderMore")}
          </Link>
        </Button>
        <Button
          asChild
          variant={billOpen ? "secondary" : "ghost"}
          className="h-14 flex-col gap-0.5 text-xs whitespace-normal"
        >
          <Link href={`${menuHref}/bill`}>
            <Receipt className="size-5" aria-hidden />
            {t("billAndPay")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
