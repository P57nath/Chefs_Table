import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { ControlsDemo } from "@/features/dev-ui/controls-demo";
import { FoundationsDemo } from "@/features/dev-ui/foundations-demo";
import { StatesDemo } from "@/features/dev-ui/states-demo";
import { StatusDemo } from "@/features/dev-ui/status-demo";

export const metadata: Metadata = { title: "UI kit", robots: { index: false, follow: false } };

/** Hidden component showcase — development only (404 in production builds). */
export default async function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const t = await getTranslations("dev");

  return (
    <SurfaceTheme surface="guest">
      <div className="min-h-dvh bg-background">
        <header className="glass sticky top-0 z-30 border-b border-border">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <h1 className="font-display text-2xl font-semibold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6">
          <FoundationsDemo />
          <ControlsDemo />
          <StatusDemo />
          <StatesDemo />
        </main>
      </div>
    </SurfaceTheme>
  );
}
