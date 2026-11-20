"use client";

import { RotateCw, ShoppingBag, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { MoneyText } from "@/components/common/money-text";
import { SlideToConfirm } from "@/components/common/slide-to-confirm";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useGuestSession } from "@/features/guest/session/guest-session";
import { localizeDigits } from "@/lib/digits";

import { cartSubtotalPreview, useCart } from "./cart-store";
import { CartLineRow } from "./cart-line";
import { usePlaceOrder } from "./use-place-order";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Menu item ids currently sold out (live from the menu query). */
  soldOutIds: ReadonlySet<string>;
}

export function CartSheet({ open, onOpenChange, soldOutIds }: CartSheetProps) {
  const t = useTranslations("guest");
  const tErr = useTranslations("errors");
  const tControls = useTranslations("controls");
  const locale = useLocale();
  const { phase } = useGuestSession();
  const { lines, orderNote, awaitingRetry, setQuantity, remove, setOrderNote } = useCart();
  const { submit, error } = usePlaceOrder();
  const [retrying, setRetrying] = useState(false);

  // Sold out: live from the menu, or named by the server's ITEM_UNAVAILABLE error.
  const unavailableName = error?.key === "itemUnavailable" ? error.params.name : null;
  const isSoldOut = (menuItemId: string, name: string) =>
    soldOutIds.has(menuItemId) || (unavailableName !== null && name === unavailableName);
  const hasSoldOut = lines.some((l) => isSoldOut(l.menuItemId, l.name));
  const canSubmit = phase === "ready" && lines.length > 0 && !hasSoldOut;

  async function retry() {
    setRetrying(true);
    try {
      await submit();
    } catch {
      // error state already set by the hook
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-xl">
        <div className="flex max-h-[85dvh] flex-col">
          <div className="px-4 pt-2">
            <DrawerTitle className="font-display text-2xl font-medium">{t("cart")}</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {t("cartItems", { count: lines.reduce((n, l) => n + l.quantity, 0) })}
            </DrawerDescription>
          </div>

          {lines.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={t("cartEmptyTitle")}
              body={t("cartEmptyBody")}
              action={
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  {t("backToMenu")}
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
                {error && !awaitingRetry ? (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-ember/10 p-3 text-sm font-medium text-foreground"
                  >
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
                    {tErr(error.key, error.params)}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <CartLineRow
                      key={line.lineId}
                      line={line}
                      soldOut={isSoldOut(line.menuItemId, line.name)}
                      frozen={awaitingRetry}
                      onQuantity={(q) => setQuantity(line.lineId, q)}
                      onRemove={() => remove(line.lineId)}
                    />
                  ))}
                </ul>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t("orderNote")}</span>
                  <Textarea
                    value={orderNote}
                    maxLength={300}
                    disabled={awaitingRetry}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder={t("orderNotePlaceholder")}
                    rows={2}
                  />
                  <span className="block text-right text-xs text-muted-foreground tabular-nums">
                    {localizeDigits(`${orderNote.length}/300`, locale)}
                  </span>
                </label>
              </div>

              <div className="pb-safe space-y-3 border-t border-border bg-popover px-4 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <MoneyText minor={cartSubtotalPreview(lines)} className="text-xl font-medium" />
                </div>
                <p className="text-xs text-muted-foreground">{t("taxesNote")}</p>
                {awaitingRetry ? (
                  <div
                    role="alert"
                    className="space-y-3 rounded-2xl border border-ember/50 bg-ember/8 p-3"
                  >
                    <p className="font-medium">{t("retryTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("retryBody")}</p>
                    <Button size="lg" className="w-full" loading={retrying} onClick={retry}>
                      <RotateCw aria-hidden />
                      {t("retrySend")}
                    </Button>
                  </div>
                ) : (
                  <SlideToConfirm
                    label={tControls("slideToPlace")}
                    pendingLabel={t("placing")}
                    doneLabel={t("placed")}
                    disabled={!canSubmit}
                    onConfirm={submit}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
