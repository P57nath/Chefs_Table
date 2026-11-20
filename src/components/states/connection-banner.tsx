"use client";

import { Wifi, WifiOff } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";

import { tween } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ConnectionStatus = "online" | "reconnecting" | "offline" | "restored";

/**
 * Slim banner shown while realtime is not SUBSCRIBED (screens poll every 10 s
 * meanwhile). "restored" flashes briefly after a reconnect.
 */
export function ConnectionBanner({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const t = useTranslations("states");
  const visible = status !== "online";
  const restored = status === "restored";

  return (
    <div aria-live="polite" className={cn("pointer-events-none", className)}>
      <AnimatePresence>
        {visible ? (
          <m.div
            key={status}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={tween.sheet}
            className={cn(
              "mx-auto flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-float",
              restored
                ? "bg-success text-white dark:text-[var(--primary-ink)]"
                : "bg-foreground text-background",
            )}
          >
            {restored ? (
              <Wifi className="size-4" aria-hidden />
            ) : (
              <WifiOff className="size-4" aria-hidden />
            )}
            {restored
              ? t("reconnected")
              : status === "offline"
                ? t("networkError")
                : t("reconnecting")}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
