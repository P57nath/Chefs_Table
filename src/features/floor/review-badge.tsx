"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

/** "Verify payment" marker for tables with an online payment waiting for a manager. */
export function ReviewBadge() {
  const t = useTranslations("floor");
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-ember/15 px-2 py-0.5 text-xs font-medium text-ember">
      <ShieldAlert className="size-3.5" aria-hidden />
      {t("toReview")}
    </span>
  );
}
