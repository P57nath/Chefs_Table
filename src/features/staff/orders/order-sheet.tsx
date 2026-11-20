"use client";

import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";
import { StatusPill } from "@/components/common/status-pill";
import { Timer } from "@/components/common/timer";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { localizeDigits } from "@/lib/digits";
import { formatClock } from "@/lib/time";
import { useMediaQuery } from "@/lib/use-media-query";

import { allowedActions, columnSince } from "../board-model";
import { useStaff } from "../staff-context";
import type { BoardOrder } from "../types";

import { LinesEditor } from "./lines-editor";
import { OrderActionsBar } from "./order-actions-bar";

interface OrderSheetProps {
  order: BoardOrder | null;
  onClose: () => void;
}

/** Order details + actions: right drawer on tablet, bottom sheet on phone. */
export function OrderSheet({ order, onClose }: OrderSheetProps) {
  const wide = useMediaQuery("(min-width: 768px)", true);
  const open = order !== null;
  if (wide) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {order ? (
            <Body
              order={order}
              onClose={onClose}
              Title={SheetTitle}
              Description={SheetDescription}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="max-h-[85dvh] overflow-y-auto">
          {order ? (
            <Body
              order={order}
              onClose={onClose}
              Title={DrawerTitle}
              Description={DrawerDescription}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Body({
  order,
  onClose,
  Title,
  Description,
}: {
  order: BoardOrder;
  onClose: () => void;
  Title: typeof SheetTitle;
  Description: typeof SheetDescription;
}) {
  const t = useTranslations("staff");
  const locale = useLocale();
  const { staff } = useStaff();
  const can = allowedActions(order.status, staff.role);
  const table = order.dining_tables?.label ?? "";

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="space-y-2 pr-10">
        <Title className="text-2xl font-medium">
          {t("orderTitle", { table, no: localizeDigits(order.order_no, locale) })}
        </Title>
        <Description className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusPill kind="order" state={order.status} size="sm" />
          <span className="tabular-nums">{formatClock(order.placed_at, locale)}</span>
          <span aria-hidden>·</span>
          <Timer since={columnSince(order)} toned={false} />
        </Description>
      </div>
      {order.customer_note ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t("guestNote")}</p>
          <p className="font-medium">{order.customer_note}</p>
        </div>
      ) : null}
      <LinesEditor key={order.id + order.status} order={order} editable={can.editLines} />
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-muted-foreground">
          {t("itemsCount", {
            count: order.order_items
              .filter((i) => !i.is_voided)
              .reduce((n, i) => n + i.quantity, 0),
          })}
        </span>
        <MoneyText minor={order.subtotal_minor} className="text-xl font-medium" />
      </div>
      {!can.editLines && (order.status === "in_kitchen" || order.status === "preparing") ? (
        <p className="text-sm text-muted-foreground">{t("editLocked")}</p>
      ) : null}
      <OrderActionsBar order={order} onDone={onClose} />
    </div>
  );
}
