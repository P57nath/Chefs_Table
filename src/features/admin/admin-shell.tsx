"use client";

import {
  Armchair,
  ClipboardList,
  CreditCard,
  Gauge,
  LayoutGrid,
  QrCode,
  Settings,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { EmberMark } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/staff/sign-out-button";
import { cn } from "@/lib/utils";

import { useAdmin } from "./admin-context";

const NAV = [
  { href: "/admin", icon: Gauge, key: "overview", exact: true },
  { href: "/admin/menu", icon: UtensilsCrossed, key: "menu" },
  { href: "/admin/floor", icon: Armchair, key: "floor" },
  { href: "/admin/qr", icon: QrCode, key: "qr" },
  { href: "/admin/staff", icon: Users, key: "staff" },
  { href: "/admin/orders", icon: ClipboardList, key: "orders" },
  { href: "/admin/payments", icon: CreditCard, key: "payments" },
  { href: "/admin/settings", icon: Settings, key: "settings" },
] as const;

/** Admin chrome: sidebar on desktop/tablet, scrollable tab strip on phones. */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const user = useAdmin();

  const links = (variant: "side" | "strip") =>
    NAV.map((item) => {
      const active =
        pathname === item.href || (!("exact" in item) && pathname.startsWith(`${item.href}/`));
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            variant === "side" ? "min-h-11" : "min-h-11 whitespace-nowrap",
            active
              ? "border-border bg-surface-2 text-foreground shadow-highlight"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <item.icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
          {t(item.key)}
        </Link>
      );
    });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="bar-surface sticky top-0 z-30 border-b border-border print:hidden">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <EmberMark className="text-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] leading-tight font-medium">
              {user.restaurantName}
            </p>
            <p className="text-xs text-muted-foreground">{t("title")}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/staff">
              <LayoutGrid aria-hidden />
              <span className="hidden sm:inline">{t("liveFloor")}</span>
            </Link>
          </Button>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <SignOutButton variant="ghost" size="sm" />
        </div>
        <nav
          aria-label={t("label")}
          className="flex gap-1 overflow-x-auto border-t border-border px-2 py-1.5 lg:hidden"
        >
          {links("strip")}
        </nav>
      </header>
      <div className="flex flex-1">
        <div className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block print:hidden">
          <nav aria-label={t("label")} className="sticky top-16 flex flex-col gap-1 p-3">
            {links("side")}
          </nav>
        </div>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
