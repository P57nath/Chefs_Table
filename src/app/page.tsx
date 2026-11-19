import { HandPlatter, ScanLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { EmberField } from "@/components/brand/ember-field";
import { Logo } from "@/components/brand/logo";
import { TableTentIllustration } from "@/components/brand/table-tent";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { brand } from "@/config/brand";
import { localizeDigits } from "@/lib/digits";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: { absolute: `${brand.name} — ${t("title")}` }, description: t("subtitle") };
}

const STEPS = [
  { icon: ScanLine, title: "step1Title", body: "step1Body" },
  { icon: HandPlatter, title: "step2Title", body: "step2Body" },
  { icon: Sparkles, title: "step3Title", body: "step3Body" },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const name = locale === "bn" ? brand.nameBn : brand.name;

  return (
    <SurfaceTheme surface="guest">
      <div className="grain relative flex min-h-dvh flex-col overflow-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(60%_60%_at_70%_30%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_70%),radial-gradient(40%_50%_at_15%_10%,color-mix(in_oklch,var(--ember)_16%,transparent),transparent_70%)]"
        />
        <EmberField />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Logo name={name} className="text-lg sm:text-xl" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main
          id="main"
          className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-6 pb-12 sm:px-6 md:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8"
        >
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-sm font-medium text-primary-text">
              <Sparkles className="size-4" aria-hidden />
              {t("eyebrow")}
            </p>
            <h1 className="font-display text-[2.5rem] leading-[1.05] font-semibold sm:text-[3.25rem]">
              {t("title")}
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">{t("subtitle")}</p>
            <div className="surface-raised flex items-start gap-4 rounded-2xl border border-border bg-card/80 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <ScanLine className="size-6" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{t("scanTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("scanBody")}</p>
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-md text-foreground">
            <TableTentIllustration label={t("scanTitle")} />
          </div>
        </main>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="surface-raised flex gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary-text">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">
                    <span className="mr-1.5 text-muted-foreground tabular-nums">
                      {localizeDigits(i + 1, locale)}.
                    </span>
                    {t(step.title)}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t(step.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="relative z-10 border-t border-border py-6 text-center text-sm text-muted-foreground">
          <p>
            {name} · {t("footer")}
          </p>
        </footer>
      </div>
    </SurfaceTheme>
  );
}
