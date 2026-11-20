"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { ConnectionBanner } from "@/components/states/connection-banner";
import { Button } from "@/components/ui/button";

import { ClosedScreen, InvalidQrScreen } from "./guest-screens";
import { useGuestSession } from "./guest-session";

/**
 * Decides what the guest sees based on the session phase. The menu renders
 * while the table is still being joined (fast first paint); ordering waits.
 */
export function GuestShell({ children }: { children: ReactNode }) {
  const t = useTranslations("guest");
  const tErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const { phase, error, connection, retry, rejoin } = useGuestSession();
  const [restarting, setRestarting] = useState(false);

  if (phase === "error" && error?.key === "tableNotFound") return <InvalidQrScreen />;
  if (phase === "closed") {
    return (
      <ClosedScreen
        restarting={restarting}
        onRestart={() => {
          setRestarting(true);
          rejoin();
        }}
      />
    );
  }

  return (
    <>
      <ConnectionBanner status={connection} className="fixed inset-x-0 top-20 z-50" />
      {phase === "error" ? (
        <div
          role="alert"
          className="fixed inset-x-0 top-20 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-ember/40 bg-popover p-3 shadow-float"
        >
          <p className="flex-1 text-sm">
            <span className="block font-medium">{t("joinErrorTitle")}</span>
            <span className="text-muted-foreground">
              {tErr(error?.key ?? "unknown", error?.params ?? {})}
            </span>
          </p>
          <Button size="sm" variant="secondary" onClick={retry}>
            <RotateCw aria-hidden />
            {tCommon("retry")}
          </Button>
        </div>
      ) : null}
      {children}
    </>
  );
}
