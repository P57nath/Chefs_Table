"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { EmberField } from "@/components/brand/ember-field";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageToggle } from "@/components/common/language-toggle";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

import { welcomeKey } from "./welcome-key";

const AUTO_CONTINUE_MS = 1_200;

/** Whether this tab had already seen the welcome when the page loaded (read once, before we write it). */
const seenCache = new Map<string, boolean>();
function seenAtLoad(token: string): boolean {
  if (!seenCache.has(token)) {
    let seen = false;
    try {
      seen = sessionStorage.getItem(welcomeKey(token)) === "1";
    } catch {
      seen = false;
    }
    seenCache.set(token, seen);
  }
  return seenCache.get(token) ?? false;
}
const noopSubscribe = () => () => {};

/**
 * Full-bleed animated welcome. Server-rendered so it paints instantly; an inline
 * script in the layout hides it before paint if this tab already saw it.
 * Auto-continues after 1.2 s.
 */
export function WelcomeOverlay({
  token,
  restaurantName,
  tableLabel,
  logoPath,
}: {
  token: string;
  restaurantName: string;
  tableLabel: string;
  logoPath: string | null;
}) {
  const t = useTranslations("guest");
  const reduce = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const seen = useSyncExternalStore(
    noopSubscribe,
    () => seenAtLoad(token),
    () => false,
  );
  const open = !seen && !dismissed;

  useEffect(() => {
    try {
      sessionStorage.setItem(welcomeKey(token), "1");
    } catch {
      // private mode: it simply shows again on the next load
    }
    if (seen) return;
    const timer = setTimeout(() => setDismissed(true), AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [token, seen]);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          data-welcome-overlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          initial={false}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
          className="dark grain fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#0E0A07] px-6 text-[#F7EFE6]"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(245,165,36,0.28),transparent_70%),radial-gradient(50%_40%_at_20%_90%,rgba(229,83,61,0.2),transparent_70%)]"
          />
          <EmberField />
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>
          <m.div
            initial={reduce ? false : { scale: 0.6, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={spring.soft}
            className="relative"
          >
            <BrandMark
              logoPath={logoPath}
              className="text-7xl drop-shadow-[0_0_30px_rgba(245,165,36,0.45)]"
            />
          </m.div>
          <m.h1
            id="welcome-title"
            initial={reduce ? false : { y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.soft, delay: 0.1 }}
            className="relative mt-6 text-center font-display text-[2.25rem] leading-tight font-semibold"
          >
            {t("welcome", { name: restaurantName })}
          </m.h1>
          <m.p
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.soft, delay: 0.18 }}
            className="relative mt-2 text-lg text-[#B9A897]"
          >
            {t.rich("youreAt", {
              table: tableLabel,
              b: (chunks) => <strong className="font-semibold text-[#F5A524]">{chunks}</strong>,
            })}
          </m.p>
          <m.div
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.soft, delay: 0.26 }}
            className="relative mt-10"
          >
            <Button size="xl" onClick={() => setDismissed(true)} autoFocus>
              {t("viewMenu")}
              <ArrowRight aria-hidden />
            </Button>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
