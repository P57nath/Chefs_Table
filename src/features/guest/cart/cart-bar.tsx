"use client";

import { ShoppingBag, TriangleAlert } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";
import { localizeDigits } from "@/lib/digits";
import { tween } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { cartCount, cartSubtotalPreview, useCart } from "./cart-store";
import { useFlyToCart } from "./fly-to-cart";

/** Floating cart bar (inverted neutral) with a small count bump on every landing. */
export function CartBar({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const lines = useCart((s) => s.lines);
  const awaitingRetry = useCart((s) => s.awaitingRetry);
  const { setTarget, landings } = useFlyToCart();
  const count = cartCount(lines);

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4">
      <AnimatePresence>
        {count > 0 ? (
          <m.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={tween.sheet}
            className="pointer-events-auto mx-auto max-w-3xl"
          >
            <button
              ref={setTarget}
              type="button"
              onClick={onOpen}
              className={cn(
                "flex h-16 w-full items-center gap-3 rounded-2xl border bg-foreground px-3 text-background shadow-float outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                awaitingRetry ? "border-ember" : "border-transparent",
              )}
            >
              <m.span
                key={landings}
                initial={reduce ? false : { scale: 1.12 }}
                animate={{ scale: 1 }}
                transition={tween.quick}
                className={cn(
                  "relative grid size-11 place-items-center rounded-lg",
                  awaitingRetry ? "bg-ember text-white" : "bg-primary text-primary-foreground",
                )}
              >
                {awaitingRetry ? (
                  <TriangleAlert className="size-5" aria-hidden />
                ) : (
                  <ShoppingBag className="size-5" aria-hidden />
                )}
                <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-sm bg-background px-1 font-mono text-[0.6875rem] font-medium text-foreground tabular-nums">
                  {localizeDigits(count, locale)}
                </span>
              </m.span>
              <span className="flex flex-1 flex-col items-start leading-tight">
                <span className="font-medium">
                  {awaitingRetry ? t("retrySend") : t("viewCart")}
                </span>
                <span className="text-sm text-background/70">{t("cartItems", { count })}</span>
              </span>
              <MoneyText
                minor={cartSubtotalPreview(lines)}
                className="text-lg font-medium tabular-nums"
              />
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
