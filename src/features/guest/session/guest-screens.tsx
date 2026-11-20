"use client";

import { HeartHandshake, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { LanguageToggle } from "@/components/common/language-toggle";
import { Button } from "@/components/ui/button";
import { FeedbackCard } from "@/features/guest/bill/feedback-card";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center"
    >
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      {children}
    </main>
  );
}

/** Unknown, rotated or deactivated QR code. */
export function InvalidQrScreen() {
  const t = useTranslations("guest");
  return (
    <Frame>
      <div className="grid size-14 place-items-center rounded-2xl border border-border bg-surface-2 text-subtle">
        <QrCode className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-3xl font-medium">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground">{t("invalidBody")}</p>
      </div>
    </Frame>
  );
}

/** Staff closed the table while this phone still had it open. */
export function ClosedScreen({
  onRestart,
  restarting,
}: {
  onRestart: () => void;
  restarting: boolean;
}) {
  const t = useTranslations("guest");
  return (
    <Frame>
      <div className="grid size-14 place-items-center rounded-2xl border border-border bg-surface-2 text-success">
        <HeartHandshake className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-3xl font-medium">{t("closedTitle")}</h1>
        <p className="text-muted-foreground">{t("closedBody")}</p>
      </div>
      <FeedbackCard className="w-full max-w-sm text-left" />
      <Button size="lg" variant="secondary" onClick={onRestart} loading={restarting}>
        {t("startNewOrder")}
      </Button>
    </Frame>
  );
}
