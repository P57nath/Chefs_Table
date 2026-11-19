"use client";

import { BellRing, ConciergeBell, Hand, Volume2, VolumeX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { EmberMark } from "@/components/brand/logo";
import { IconButton } from "@/components/common/icon-button";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { ConnectionBanner } from "@/components/states/connection-banner";
import { canUse, FLOOR_ROLES } from "@/features/auth/roles";
import { localizeDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

import { useBoardOrders, useOpenRequests } from "./queries";
import { SignOutButton } from "./sign-out-button";
import { useStaff } from "./staff-context";
import { StaffNav } from "./staff-nav";
import { StartShift } from "./start-shift";
import { useStaffAlerts } from "./use-staff-alerts";

function Counter({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BellRing;
  label: string;
  value: number;
  tone: string;
}) {
  const locale = useLocale();
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5"
      title={label}
    >
      <Icon className={cn("size-4", value > 0 ? tone : "text-muted-foreground")} aria-hidden />
      <span className="text-sm font-semibold tabular-nums">{localizeDigits(value, locale)}</span>
      <span className="sr-only">{label}</span>
      <span className="hidden text-sm text-muted-foreground lg:inline">{label}</span>
    </div>
  );
}

export function StaffShell({ children }: { children: ReactNode }) {
  const t = useTranslations("staff");
  const { staff, connection, shift } = useStaff();
  const floor = canUse(staff.role, FLOOR_ROLES);
  const orders = useBoardOrders(floor);
  const requests = useOpenRequests(floor);
  useStaffAlerts(floor ? orders.data : undefined, floor ? requests.data : undefined);

  const newCount = orders.data?.filter((o) => o.status === "placed").length ?? 0;
  const readyCount = orders.data?.filter((o) => o.status === "ready").length ?? 0;
  const requestCount = requests.data?.filter((r) => r.status === "open").length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="flex h-16 items-center gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <EmberMark className="text-2xl" />
            <span className="hidden truncate font-display text-lg font-semibold sm:inline">
              {staff.restaurantName}
            </span>
          </div>
          {floor ? (
            <div className="flex flex-1 items-center justify-center gap-2 overflow-x-auto">
              <Counter
                icon={BellRing}
                label={t("counterNew")}
                value={newCount}
                tone="text-primary-text"
              />
              <Counter
                icon={ConciergeBell}
                label={t("counterReady")}
                value={readyCount}
                tone="text-success"
              />
              <Counter
                icon={Hand}
                label={t("counterRequests")}
                value={requestCount}
                tone="text-ember"
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <IconButton
            label={shift.sound ? t("soundOn") : t("soundOff")}
            aria-pressed={shift.sound}
            onClick={() => shift.setSound(!shift.sound)}
          >
            {shift.sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </IconButton>
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <span
            aria-hidden
            className="hidden size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white sm:grid"
            style={{ background: staff.avatarColor }}
            title={`${staff.displayName} · ${t(`role_${staff.role}`)}`}
          >
            {[...staff.displayName][0]}
          </span>
          <SignOutButton variant="ghost" size="sm" className="hidden md:inline-flex" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 lg:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <SignOutButton variant="ghost" size="sm" className="md:hidden" />
        </div>
      </header>
      <ConnectionBanner status={connection} className="fixed inset-x-0 top-20 z-50" />
      <div className="flex flex-1">
        <StaffNav variant="rail" counts={{ orders: newCount, requests: requestCount }} />
        <main id="main" className="min-w-0 flex-1 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <StaffNav variant="bar" counts={{ orders: newCount, requests: requestCount }} />
      <StartShift />
    </div>
  );
}
