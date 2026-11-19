"use client";

import { Hand, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { asAppError } from "@/lib/errors";

import type { GuestRequest } from "./types";
import { useCreateRequest } from "./use-guest-data";

interface ActionBarProps {
  menuHref: string;
  openRequests: GuestRequest[];
  onCallWaiter: () => void;
}

/** Call waiter · Order more · Request bill. */
export function ActionBar({ menuHref, openRequests, onCallWaiter }: ActionBarProps) {
  const t = useTranslations("guest");
  const tErr = useTranslations("errors");
  const create = useCreateRequest();
  const billOpen = openRequests.some((r) => r.type === "request_bill");
  const callOpen = openRequests.some((r) => r.type !== "request_bill");

  async function requestBill() {
    try {
      await create.mutateAsync({ type: "request_bill" });
      toast.success(t("billRequested"));
    } catch (err) {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    }
  }

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4">
      <div className="glass pointer-events-auto mx-auto grid max-w-3xl grid-cols-3 gap-2 rounded-2xl border border-border p-2 shadow-lg">
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
          variant={billOpen ? "secondary" : "ghost"}
          className="h-14 flex-col gap-0.5 text-xs whitespace-normal"
          onClick={requestBill}
          disabled={billOpen}
          loading={create.isPending && create.variables?.type === "request_bill"}
        >
          <Receipt className="size-5" aria-hidden />
          {billOpen ? t("billRequested") : t("requestBill")}
        </Button>
      </div>
    </div>
  );
}
