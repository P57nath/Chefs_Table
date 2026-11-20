import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/common/language-toggle";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { ArchReveal } from "@/features/landing/arch-reveal";
import { DishMarquee } from "@/features/landing/dish-marquee";
import { LandingHeader } from "@/features/landing/landing-header";
import { LandingHero } from "@/features/landing/landing-hero";
import { Manifesto } from "@/features/landing/manifesto";
import { OrderStory } from "@/features/landing/order-story";
import { WordmarkFill } from "@/features/landing/wordmark-fill";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const title = `${brand.name} — ${t("title")}`;
  const description = t("subtitle", { name: brand.name });
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: brand.name, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

const DISHES = ["dish1", "dish2", "dish3", "dish4", "dish5", "dish6", "dish7"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const locale = (await getLocale()) as Locale;
  const name = locale === "bn" ? brand.nameBn : brand.name;

  return (
    <SurfaceTheme surface="guest">
      <div className="flex min-h-dvh flex-col overflow-x-clip bg-background">
        <LandingHeader
          logo={<Logo name={name} className="text-lg" />}
          staffLabel={t("staffLogin")}
          controls={
            <>
              <LanguageToggle />
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
            </>
          }
        />

        <main id="main" className="flex-1">
          <LandingHero locale={locale} name={name} />
          <DishMarquee label={t("dishesLabel")} dishes={DISHES.map((k) => t(k))} />
          <Manifesto text={t("manifesto")} />
          <OrderStory />
          <ArchReveal />
        </main>

        <footer className="border-t border-border">
          <WordmarkFill name={name} />
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              {name} · {t("footer")}
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("staffLogin")}
            </Link>
          </div>
        </footer>
      </div>
    </SurfaceTheme>
  );
}
