"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { reviewPaymentAction } from "@/features/floor/actions";

import { useRun } from "../use-run";

/** Approve / reject an online payment parked for review (same action as the floor). */
export function ReviewButtons({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin.payments");
  const { run, pendingKey } = useRun();
  const go = (approve: boolean) =>
    run(
      async () => {
        const r = await reviewPaymentAction({ paymentId, approve });
        return r.ok
          ? { ok: true as const }
          : { ok: false as const, error: r.error === "forbidden" ? "FORBIDDEN" : "UNKNOWN" };
      },
      { key: approve ? "a" : "r", success: approve ? t("approved") : t("rejected") },
    );
  return (
    <div className="flex gap-2">
      <Button size="sm" loading={pendingKey === "a"} onClick={() => go(true)}>
        {t("approve")}
      </Button>
      <Button
        size="sm"
        variant="destructive-soft"
        loading={pendingKey === "r"}
        onClick={() => go(false)}
      >
        {t("reject")}
      </Button>
    </div>
  );
}
