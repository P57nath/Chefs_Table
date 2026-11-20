"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageToggle } from "@/components/common/language-toggle";
import { Button } from "@/components/ui/button";
import { tween } from "@/lib/motion";

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
 * Full-bleed welcome: brand, restaurant and table on a calm dark surface. Server-rendered so it paints instantly; an inline
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
          exit={{ opacity: 0 }}
          transition={tween.sheet}
          className="dark fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-background px-6 text-foreground"
        >
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>
          <m.div
            initial={reduce ? false : { y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={tween.enter}
            className="flex flex-col items-center text-center"
          >
            <BrandMark logoPath={logoPath} className="text-5xl" />
            <h1
              id="welcome-title"
              className="mt-8 font-display text-[2.25rem] leading-[1.1] font-normal tracking-[-0.02em]"
            >
              {t("welcome", { name: restaurantName })}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {t.rich("youreAt", {
                table: tableLabel,
                b: (chunks) => (
                  <strong className="font-mono font-medium text-primary-text">{chunks}</strong>
                ),
              })}
            </p>
            <Button size="xl" className="mt-12" onClick={() => setDismissed(true)} autoFocus>
              {t("viewMenu")}
              <ArrowRight aria-hidden />
            </Button>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
