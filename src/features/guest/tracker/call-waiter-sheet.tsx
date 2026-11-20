"use client";

import { Check, GlassWater, Hand, MessageSquareMore, Utensils } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { asAppError } from "@/lib/errors";
import { formatAge } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import type { GuestRequest } from "./types";
import { useCreateRequest } from "./use-guest-data";

const OPTIONS = [
  { type: "call_waiter", icon: Hand, label: "requestCallWaiter" },
  { type: "water", icon: GlassWater, label: "requestWater" },
  { type: "cutlery", icon: Utensils, label: "requestCutlery" },
  { type: "other", icon: MessageSquareMore, label: "requestOther" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openRequests: GuestRequest[];
}

/** Call waiter / Water / Cutlery / Other (note). Open requests show "notified · 2 min ago". */
export function CallWaiterSheet({ open, onOpenChange, openRequests }: Props) {
  const t = useTranslations("guest");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const now = useNow();
  const create = useCreateRequest();
  const [otherOpen, setOtherOpen] = useState(false);
  const [note, setNote] = useState("");

  async function send(type: GuestRequest["type"], text?: string) {
    try {
      await create.mutateAsync({ type, note: text });
      toast.success(t("requestSent"));
      setOtherOpen(false);
      setNote("");
      onOpenChange(false);
    } catch (err) {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-xl">
        <div className="pb-safe space-y-4 px-4 pt-2">
          <DrawerTitle className="font-display text-2xl font-medium">
            {t("callOptionsTitle")}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{t("callOptionsTitle")}</DrawerDescription>
          <div className="grid grid-cols-2 gap-3">
            {OPTIONS.map((o) => {
              const pending = openRequests.find((r) => r.type === o.type);
              return (
                <button
                  key={o.type}
                  type="button"
                  disabled={!!pending || create.isPending}
                  aria-pressed={o.type === "other" ? otherOpen : undefined}
                  onClick={() => (o.type === "other" ? setOtherOpen((v) => !v) : void send(o.type))}
                  className={cn(
                    "flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border p-4 text-left font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    pending
                      ? "border-success/50 bg-success/10"
                      : "border-border bg-surface hover:bg-muted",
                  )}
                >
                  {pending ? (
                    <Check className="size-6 text-success" aria-hidden />
                  ) : (
                    <o.icon className="size-6 text-primary-text" aria-hidden />
                  )}
                  <span>{t(o.label)}</span>
                  {pending ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("requestPending", {
                        age: now === null ? "" : formatAge(pending.created_at, now, locale),
                      })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {otherOpen ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("requestOtherPlaceholder")}
                aria-label={t("requestOther")}
                rows={2}
              />
              <Button
                className="w-full"
                size="lg"
                disabled={!note.trim()}
                loading={create.isPending}
                onClick={() => send("other", note)}
              >
                {t("send")}
              </Button>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
