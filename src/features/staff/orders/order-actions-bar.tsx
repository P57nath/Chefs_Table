"use client";

import { Check, ChefHat, ConciergeBell, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { allowedActions } from "../board-model";
import { useAdvanceOrder } from "../order-actions";
import { useStaff } from "../staff-context";
import type { BoardOrder } from "../types";

import { ReasonDialog } from "./reason-dialog";

/** All actions for an order, filtered by role + status (the database still decides). */
export function OrderActionsBar({ order, onDone }: { order: BoardOrder; onDone?: () => void }) {
  const t = useTranslations("staff");
  const { staff } = useStaff();
  const advance = useAdvanceOrder();
  const [reasonOpen, setReasonOpen] = useState(false);
  const can = allowedActions(order.status, staff.role);
  const busy = advance.isPending;
  const go = (to: Parameters<typeof advance.mutate>[0]["to"], reason?: string) =>
    advance.mutate(
      { order, to, reason },
      { onSuccess: () => (to === "cancelled" || to === "served" ? onDone?.() : undefined) },
    );

  return (
    <div className="flex flex-wrap gap-2">
      {can.confirmAndSend ? (
        <Button
          size="lg"
          className="flex-1 basis-full sm:basis-auto"
          disabled={busy}
          loading={busy && advance.variables?.to === "in_kitchen"}
          onClick={() => go("in_kitchen")}
        >
          <ChefHat aria-hidden />
          {t("confirmAndSend")}
        </Button>
      ) : null}
      {can.confirm ? (
        <Button
          size="lg"
          variant="secondary"
          disabled={busy}
          loading={busy && advance.variables?.to === "confirmed"}
          onClick={() => go("confirmed")}
        >
          <Check aria-hidden />
          {t("confirm")}
        </Button>
      ) : null}
      {can.send ? (
        <Button
          size="lg"
          className="flex-1"
          disabled={busy}
          loading={busy}
          onClick={() => go("in_kitchen")}
        >
          <Send aria-hidden />
          {t("send")}
        </Button>
      ) : null}
      {can.serve ? (
        <Button
          size="lg"
          className="flex-1"
          disabled={busy}
          loading={busy}
          onClick={() => go("served")}
        >
          <ConciergeBell aria-hidden />
          {t("markServed")}
        </Button>
      ) : null}
      {can.reject || can.cancelInKitchen ? (
        <Button
          size="lg"
          variant="destructive-soft"
          disabled={busy}
          onClick={() => setReasonOpen(true)}
        >
          <X aria-hidden />
          {can.reject ? t("reject") : t("cancelOrder")}
        </Button>
      ) : null}
      <ReasonDialog
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        title={can.reject ? t("rejectTitle") : t("cancelTitle")}
        confirmLabel={can.reject ? t("reject") : t("cancelOrder")}
        pending={busy && advance.variables?.to === "cancelled"}
        onConfirm={(reason) => {
          setReasonOpen(false);
          go("cancelled", reason);
        }}
      />
    </div>
  );
}
