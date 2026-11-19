"use client";

import { HeartHandshake, QrCode } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmberMark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/common/language-toggle";
import { Button } from "@/components/ui/button";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="grain relative flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center"
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
      <div className="grid size-20 place-items-center rounded-full bg-primary/12 text-primary-text">
        <QrCode className="size-9" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-3xl font-semibold">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground">{t("invalidBody")}</p>
      </div>
      <EmberMark className="mt-6 text-3xl opacity-80" />
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
      <div className="grid size-20 place-items-center rounded-full bg-success/15 text-success">
        <HeartHandshake className="size-9" aria-hidden />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-3xl font-semibold">{t("closedTitle")}</h1>
        <p className="text-muted-foreground">{t("closedBody")}</p>
      </div>
      <Button size="lg" variant="secondary" onClick={onRestart} loading={restarting}>
        {t("startNewOrder")}
      </Button>
    </Frame>
  );
}
