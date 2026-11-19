"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme, type ThemeChoice } from "@/components/providers/theme";
import { useSyncExternalStore } from "react";

import { SegmentedControl } from "./segmented-control";

const subscribe = () => () => {};

/** Light / Dark / System. Renders after mount (theme is only known on the client). */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme, forcedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (forcedTheme) return null;
  if (!mounted) return <div className="h-11 w-[8.5rem] rounded-full bg-surface-2" aria-hidden />;

  return (
    <SegmentedControl<ThemeChoice>
      label={t("label")}
      size="sm"
      value={theme}
      onChange={setTheme}
      options={[
        { value: "light", label: null, icon: <Sun aria-hidden />, ariaLabel: t("light") },
        { value: "dark", label: null, icon: <Moon aria-hidden />, ariaLabel: t("dark") },
        { value: "system", label: null, icon: <Monitor aria-hidden />, ariaLabel: t("system") },
      ]}
    />
  );
}
