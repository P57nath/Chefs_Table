"use client";

import { useTranslations } from "next-intl";

const KNOWN = [
  "FORBIDDEN",
  "INVALID_INPUT",
  "DUPLICATE",
  "IN_USE",
  "NOT_FOUND",
  "LAST_OWNER",
  "SELF",
  "EMAIL_TAKEN",
  "OWNER_ONLY",
] as const;

/** Server-action error code → friendly English message (admin namespace). */
export function useActionError() {
  const t = useTranslations("admin.errors");
  return (code: string) =>
    (KNOWN as readonly string[]).includes(code) ? t(code as (typeof KNOWN)[number]) : t("UNKNOWN");
}
