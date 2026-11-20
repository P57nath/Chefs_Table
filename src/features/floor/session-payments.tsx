"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyText } from "@/components/common/money-text";
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
import { canUse, MANAGEMENT_ROLES } from "@/features/auth/roles";
import { useStaff } from "@/features/staff/staff-context";
import { AppErrorException, toAppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

import { reviewPaymentAction } from "./actions";

interface StaffPayment {
  id: string;
  method: "cash" | "sslcommerz";
  channel: string | null;
  amount_minor: number;
  status: "initiated" | "pending_review" | "paid" | "failed" | "cancelled" | "refunded";
  created_at: string;
  gateway_payload: unknown;
}

const CHANNELS = ["cash", "card", "bkash", "nagad", "bank"] as const;
const channelOf = (p: StaffPayment): (typeof CHANNELS)[number] =>
  CHANNELS.find((c) => c === p.channel) ?? (p.method === "cash" ? "cash" : "card");

const reasonOf = (p: StaffPayment): "RISK" | "OVERPAYMENT" | "SESSION_CLOSED" => {
  const r =
    p.gateway_payload && typeof p.gateway_payload === "object"
      ? (p.gateway_payload as Record<string, unknown>).review_reason
      : null;
  return r === "OVERPAYMENT" || r === "SESSION_CLOSED" ? r : "RISK";
};

/** Payments of one table; managers verify online payments parked for review. */
export function SessionPayments({ sessionId }: { sessionId: string }) {
  const t = useTranslations("floor");
  const tErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const { staff, poll } = useStaff();
  const isManager = canUse(staff.role, MANAGEMENT_ROLES);
  const [pending, setPending] = useState<{ p: StaffPayment; approve: boolean } | null>(null);

  const payments = useQuery({
    queryKey: [...qk.staff(), "session", sessionId, "payments"],
    refetchInterval: poll,
    queryFn: async (): Promise<StaffPayment[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("payments")
        .select("id, method, channel, amount_minor, status, created_at, gateway_payload")
        .eq("session_id", sessionId)
        .in("status", ["paid", "pending_review"])
        .order("created_at", { ascending: true });
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });

  const review = useMutation({
    mutationFn: async (v: { paymentId: string; approve: boolean }) => {
      const res = await reviewPaymentAction(v);
      if (!res.ok) throw new AppErrorException({ ...toAppError(""), key: res.error });
      return res;
    },
    onSuccess: (_r, v) => toast.success(v.approve ? t("reviewApproved") : t("reviewRejected")),
    onError: (err) => {
      const e = err instanceof AppErrorException ? err.appError : toAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => {
      setPending(null);
      return qc.invalidateQueries({ queryKey: qk.staff() });
    },
  });

  const rows = payments.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="payments-title" className="space-y-2">
      <h3 id="payments-title" className="font-medium">
        {t("payments")}
      </h3>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {rows.map((p) => {
          const review_ = p.status === "pending_review";
          return (
            <li key={p.id} className={cn("space-y-2 p-3", review_ && "bg-ember/8")}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{t(`channel_${channelOf(p)}`)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatClock(p.created_at, locale)}
                  </span>
                </span>
                <MoneyText minor={p.amount_minor} className="font-medium" />
              </div>
              {review_ ? (
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-sm text-ember">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {t(`reviewReason_${reasonOf(p)}`)}
                  </p>
                  {isManager ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setPending({ p, approve: true })}>
                        {t("reviewApprove")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive-soft"
                        onClick={() => setPending({ p, approve: false })}
                      >
                        {t("reviewReject")}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("reviewAskManager")}</p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.approve ? t("reviewApproveTitle") : t("reviewRejectTitle")}
            </DialogTitle>
            <DialogDescription>
              {pending
                ? t(pending.approve ? "reviewApproveBody" : "reviewRejectBody", {
                    amount: formatMoney(pending.p.amount_minor, locale),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button
              variant={pending?.approve ? "default" : "destructive"}
              loading={review.isPending}
              onClick={() =>
                pending && review.mutate({ paymentId: pending.p.id, approve: pending.approve })
              }
            >
              {pending?.approve ? t("reviewApprove") : t("reviewReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
