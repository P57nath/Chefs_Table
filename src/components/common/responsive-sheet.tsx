"use client";

import type { ReactNode } from "react";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Optional sticky footer (actions). */
  footer?: ReactNode;
}

/** Right drawer on tablets/desktop, bottom sheet (drag to dismiss) on phones. */
export function ResponsiveSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ResponsiveSheetProps) {
  const wide = useMediaQuery("(min-width: 768px)", true);
  const onOpenChange = (o: boolean) => !o && onClose();

  if (wide) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <div className="space-y-1 border-b border-border p-5 pr-14">
            <SheetTitle className="font-display text-2xl font-medium">{title}</SheetTitle>
            {description ? (
              <SheetDescription asChild>
                <div className="text-sm text-muted-foreground">{description}</div>
              </SheetDescription>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex max-h-[85dvh] flex-col">
          <div className="space-y-1 px-4 pt-2 pb-3">
            <DrawerTitle className="font-display text-2xl font-medium">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription asChild>
                <div className="text-sm text-muted-foreground">{description}</div>
              </DrawerDescription>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer ? <div className="pb-safe border-t border-border px-4 pt-3">{footer}</div> : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
