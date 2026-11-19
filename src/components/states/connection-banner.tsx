"use client";

import { Wifi, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";

import { spring } from "@/lib/motion";
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
          <motion.div
            key={status}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={spring.sheet}
            className={cn(
              "mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-lg",
              restored
                ? "bg-success text-white dark:text-[var(--primary-ink)]"
                : "bg-foreground text-background",
            )}
          >
            {restored ? (
              <Wifi className="size-4" aria-hidden />
            ) : (
              <WifiOff className="size-4 animate-pulse" aria-hidden />
            )}
            {restored
              ? t("reconnected")
              : status === "offline"
                ? t("networkError")
                : t("reconnecting")}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
