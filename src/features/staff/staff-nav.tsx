"use client";

import { Ban, ChefHat, ClipboardList, Hand } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { canUse, FLOOR_ROLES, KITCHEN_ROLES } from "@/features/auth/roles";
import { localizeDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

import { useStaff } from "./staff-context";

export interface NavCounts {
  orders: number;
  requests: number;
}

const ITEMS = [
  {
    href: "/staff/orders",
    icon: ClipboardList,
    label: "navOrders",
    count: "orders",
    floorOnly: true,
  },
  { href: "/staff/requests", icon: Hand, label: "navRequests", count: "requests", floorOnly: true },
  { href: "/staff/menu", icon: Ban, label: "navMenu", count: null, floorOnly: false },
  {
    href: "/kitchen",
    icon: ChefHat,
    label: "navKitchen",
    count: null,
    floorOnly: false,
    kitchenOnly: true,
  },
] as const;

/** Left rail on tablets, bottom bar on phones. */
export function StaffNav({ counts, variant }: { counts: NavCounts; variant: "rail" | "bar" }) {
  const t = useTranslations("staff");
  const locale = useLocale();
  const pathname = usePathname();
  const { staff } = useStaff();
  const items = ITEMS.filter(
    (i) =>
      (!i.floorOnly || canUse(staff.role, FLOOR_ROLES)) &&
      (!("kitchenOnly" in i) || canUse(staff.role, KITCHEN_ROLES)),
  );

  return (
    <nav
      aria-label={t("navLabel")}
      className={cn(
        variant === "rail"
          ? "hidden w-24 shrink-0 flex-col gap-1 border-r border-border bg-surface p-2 md:flex"
          : "glass pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t border-border md:hidden",
      )}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.count ? counts[item.count] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              variant === "rail" ? "min-h-20 flex-none" : "min-h-16",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-6", active && "text-primary-text")} aria-hidden />
            {t(item.label)}
            {count > 0 ? (
              <span className="absolute top-1.5 right-3 grid min-w-5 place-items-center rounded-full bg-ember px-1 text-[0.6875rem] font-bold text-white tabular-nums">
                {localizeDigits(count, locale)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
