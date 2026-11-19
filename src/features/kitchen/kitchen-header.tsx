"use client";

import { Ban, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { EmberMark } from "@/components/brand/logo";
import { IconButton } from "@/components/common/icon-button";
import { LanguageToggle } from "@/components/common/language-toggle";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/staff/sign-out-button";
import { useStaff } from "@/features/staff/staff-context";
import { formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";

/** KDS header: brand, live clock, sold-out shortcut, sound, language, sign out. */
export function KitchenHeader() {
  const t = useTranslations("kitchen");
  const tStaff = useTranslations("staff");
  const locale = useLocale();
  const now = useNow();
  const { staff, shift } = useStaff();

  return (
    <header className="flex h-20 shrink-0 items-center gap-4 border-b border-border px-6">
      <EmberMark className="text-3xl" />
      <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
      <span className="truncate text-lg text-muted-foreground">{staff.restaurantName}</span>
      <time className="ml-auto text-3xl font-semibold tabular-nums" suppressHydrationWarning>
        {now === null ? "" : formatClock(now, locale)}
      </time>
      <Button asChild variant="secondary" size="lg">
        <Link href="/staff/menu">
          <Ban aria-hidden />
          {t("soldOut")}
        </Link>
      </Button>
      <IconButton
        size="icon-lg"
        label={shift.sound ? tStaff("soundOn") : tStaff("soundOff")}
        aria-pressed={shift.sound}
        onClick={() => shift.setSound(!shift.sound)}
      >
        {shift.sound ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      </IconButton>
      <LanguageToggle />
      <SignOutButton variant="ghost" size="lg" />
    </header>
  );
}
