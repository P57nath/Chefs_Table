"use client";

import { Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { playChime, unlockAudio } from "@/lib/sound";

import { useStaff } from "./staff-context";

/** Start-of-shift screen: the "Start" tap unlocks audio and requests a wake lock (spec §5.1). */
export function StartShift() {
  const t = useTranslations("staff");
  const { staff, shift } = useStaff();
  if (shift.started) return null;

  async function start() {
    const ok = await unlockAudio();
    if (ok && shift.sound) playChime("success");
    shift.start();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shift-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur"
    >
      <div className="surface-raised w-full max-w-sm space-y-6 rounded-3xl border border-border bg-card p-6 text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-full text-2xl font-semibold text-white"
          style={{ background: staff.avatarColor }}
        >
          {[...staff.displayName][0]}
        </span>
        <div className="space-y-1">
          <h1 id="shift-title" className="font-display text-2xl font-semibold">
            {t("shiftTitle", { name: staff.displayName })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(`role_${staff.role}`)} · {staff.restaurantName}
          </p>
          <p className="text-sm text-muted-foreground">{t("shiftBody")}</p>
        </div>
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="shift-sound">{t("shiftSound")}</Label>
            <Switch id="shift-sound" checked={shift.sound} onCheckedChange={shift.setSound} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="shift-vibration">{t("shiftVibration")}</Label>
            <Switch
              id="shift-vibration"
              checked={shift.vibration}
              onCheckedChange={shift.setVibration}
            />
          </div>
        </div>
        <Button size="xl" className="w-full" onClick={start} autoFocus>
          <Play aria-hidden />
          {t("shiftStart")}
        </Button>
      </div>
    </div>
  );
}
