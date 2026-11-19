"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

/**
 * One theme provider per surface (next-themes ignores nested providers, so the
 * root layout has none). Defaults from docs/04-DESIGN-SYSTEM.md §1:
 *   guest  → dark "Ember Night" (light available)
 *   staff  → light (dark available) — floor + admin
 *   kitchen→ dark only
 */
export type Surface = "guest" | "staff" | "kitchen";

const CONFIG: Record<Surface, { defaultTheme: string; forcedTheme?: string; storageKey: string }> =
  {
    guest: { defaultTheme: "dark", storageKey: "es-theme-guest" },
    staff: { defaultTheme: "light", storageKey: "es-theme-staff" },
    kitchen: { defaultTheme: "dark", forcedTheme: "dark", storageKey: "es-theme-kitchen" },
  };

export function SurfaceTheme({ surface, children }: { surface: Surface; children: ReactNode }) {
  const config = CONFIG[surface];
  return (
    <ThemeProvider
      attribute="class"
      enableSystem
      disableTransitionOnChange
      defaultTheme={config.defaultTheme}
      forcedTheme={config.forcedTheme}
      storageKey={config.storageKey}
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
