import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SurfaceTheme } from "@/components/providers/surface-theme";
import { Button } from "@/components/ui/button";

/** Branded 404 for any unknown URL. */
export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <SurfaceTheme surface="guest">
      <main
        id="main"
        className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center"
      >
        <div className="grid size-14 place-items-center rounded-2xl border border-border bg-surface-2 text-subtle">
          <Compass className="size-6" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <h1 className="font-display text-3xl font-normal">{t("notFoundTitle")}</h1>
          <p className="text-muted-foreground">{t("notFoundBody")}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </main>
    </SurfaceTheme>
  );
}
