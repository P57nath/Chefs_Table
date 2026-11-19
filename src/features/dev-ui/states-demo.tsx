"use client";

import { UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SegmentedControl } from "@/components/common/segmented-control";
import { ConnectionBanner, type ConnectionStatus } from "@/components/states/connection-banner";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard, SkeletonList, SkeletonMenuItem } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Row, Section } from "./section";

export function StatesDemo() {
  const [conn, setConn] = useState<ConnectionStatus>("online");

  return (
    <Section title="States & overlays">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState
            icon={UtensilsCrossed}
            title="No orders yet"
            body="When guests order, their tables light up here."
            action={<Button variant="secondary">View menu</Button>}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card">
          <ErrorState onRetry={() => toast("Retrying…")} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SkeletonList label="Loading menu" count={2} item={SkeletonMenuItem} />
        <SkeletonCard />
      </div>
      <Row label="Connection banner">
        <SegmentedControl<ConnectionStatus>
          label="Connection state"
          size="sm"
          value={conn}
          onChange={setConn}
          options={[
            { value: "online", label: "Online" },
            { value: "reconnecting", label: "Reconnecting" },
            { value: "offline", label: "Offline" },
            { value: "restored", label: "Restored" },
          ]}
        />
      </Row>
      <ConnectionBanner status={conn} className="fixed inset-x-0 top-20 z-40" />
      <Row label="Toasts & sheets">
        <Button variant="secondary" onClick={() => toast.success("Order confirmed · T4")}>
          Success toast
        </Button>
        <Button variant="secondary" onClick={() => toast.error("Firni just sold out")}>
          Error toast
        </Button>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Bottom sheet</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="font-display text-xl">Ember Smash Burger</DrawerTitle>
              <DrawerDescription>Drag down to dismiss.</DrawerDescription>
            </DrawerHeader>
            <div className="h-48" />
          </DrawerContent>
        </Drawer>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Side sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-display text-xl">Table T4</SheetTitle>
              <SheetDescription>4 guests · seated 32 min</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Row>
    </Section>
  );
}
