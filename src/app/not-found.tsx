import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmberMark } from "@/components/brand/logo";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { Button } from "@/components/ui/button";

/** Branded 404 for any unknown URL. */
export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <SurfaceTheme surface="guest">
      <main
        id="main"
        className="grain flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center"
      >
        <div className="grid size-20 place-items-center rounded-full bg-primary/12 text-primary-text">
          <Compass className="size-9" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <h1 className="font-display text-3xl font-semibold">{t("notFoundTitle")}</h1>
          <p className="text-muted-foreground">{t("notFoundBody")}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/">{t("goHome")}</Link>
        </Button>
        <EmberMark className="mt-4 text-3xl opacity-80" />
      </main>
    </SurfaceTheme>
  );
}
