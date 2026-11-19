"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { LOCALES, type Locale } from "@/i18n/config";

import { SegmentedControl } from "./segmented-control";

/** EN / বাংলা switch. Persists in a cookie and re-renders server components. */
export function LanguageToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      const result = await setLocale(next);
      if (result.ok) router.refresh();
    });
  }

  return (
    <SegmentedControl
      label={t("label")}
      size={size}
      value={locale}
      onChange={change}
      className={pending ? "opacity-70" : undefined}
      options={LOCALES.map((l) => ({
        value: l,
        label: <span lang={l}>{l === "en" ? "EN" : "বাংলা"}</span>,
        ariaLabel: t(l),
      }))}
    />
  );
}
