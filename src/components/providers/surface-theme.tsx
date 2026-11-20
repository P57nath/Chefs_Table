"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

import { ThemeProvider, type ResolvedTheme, type ThemeChoice } from "./theme";

/**
 * One theme provider per surface (each section mounts its own; the root layout has none). Defaults from docs/04-DESIGN-SYSTEM.md §1:
 *   guest  → dark, warm neutral ramp (light available)
 *   staff  → light (dark available) — floor + admin
 *   kitchen→ dark only
 */
export type Surface = "guest" | "staff" | "kitchen";

const CONFIG: Record<
  Surface,
  { defaultTheme: ThemeChoice; forcedTheme?: ResolvedTheme; storageKey: string }
> = {
  guest: { defaultTheme: "dark", storageKey: "es-theme-guest" },
  staff: { defaultTheme: "light", storageKey: "es-theme-staff" },
  kitchen: { defaultTheme: "dark", forcedTheme: "dark", storageKey: "es-theme-kitchen" },
};

export function SurfaceTheme({ surface, children }: { surface: Surface; children: ReactNode }) {
  const config = CONFIG[surface];
  return (
    <ThemeProvider
      defaultTheme={config.defaultTheme}
      forcedTheme={config.forcedTheme}
      storageKey={config.storageKey}
      surface={surface}
    >
      {children}
      <Toaster
        position={surface === "guest" ? "top-center" : "bottom-right"}
        richColors={false}
        closeButton={surface !== "guest"}
      />
    </ThemeProvider>
  );
}
