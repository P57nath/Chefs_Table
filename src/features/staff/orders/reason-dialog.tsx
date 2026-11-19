"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Chip } from "@/components/common/chip";
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
import { Textarea } from "@/components/ui/textarea";

const QUICK = ["reasonSoldOut", "reasonDuplicate", "reasonGuestAsked"] as const;

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: (reason: string) => void;
}

/** Reject / cancel needs a reason (advance_order enforces it; the guest sees it). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  pending,
  onConfirm,
}: ReasonDialogProps) {
  const t = useTranslations("staff");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = reason.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setReason("");
          setTouched(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("reasonLabel")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((k) => (
            <Chip key={k} size="sm" active={reason === t(k)} onClick={() => setReason(t(k))}>
              {t(k)}
            </Chip>
          ))}
        </div>
        <Textarea
          value={reason}
          maxLength={200}
          aria-label={t("reasonLabel")}
          aria-invalid={touched && !valid ? true : undefined}
          placeholder={t("reasonPlaceholder")}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {touched && !valid ? <p className="text-sm text-ember">{t("reasonRequired")}</p> : null}
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="secondary">{t("keep")}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            loading={pending}
            onClick={() => (valid ? onConfirm(reason.trim()) : setTouched(true))}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
