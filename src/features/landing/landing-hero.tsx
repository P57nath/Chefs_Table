import { ScanLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

import { Docket, DocketNumber } from "@/components/brand/docket";
import { StatusPill } from "@/components/common/status-pill";
import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";

import { GlyphHandi } from "./glyph-handi";

const LINES = [
  { qty: 2, name: "previewItem1", note: "previewNote" },
  { qty: 1, name: "previewItem2", note: null },
  { qty: 3, name: "previewItem3", note: null },
] as const;

/**
 * Hero: the headline rises word by word (CSS only, so it paints before
 * hydration), the glyph handi assembles on the right inside a Mughal arch that
 * draws itself, and the kitchen docket prints out once the lid is off.
 */
export async function LandingHero({ locale, name }: { locale: Locale; name: string }) {
  const t = await getTranslations("landing");
  const d = (v: string | number) => localizeDigits(v, locale);
  const words = t("title").split(" ");

  return (
    <section className="relative mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 pt-24 pb-16 sm:px-6 md:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-8">
      <div className="relative z-10">
        <h1 className="font-display text-[2.75rem] leading-[1.04] font-normal tracking-[-0.02em] sm:text-[4rem] lg:text-[5.25rem] lg:tracking-[-0.035em] [:lang(bn)_&]:leading-[1.28]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
              <span className="landing-rise inline-block" style={{ "--i": i } as CSSProperties}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            </span>
          ))}
        </h1>
        <p
          className="landing-fade mt-6 max-w-[36rem] text-lg leading-[1.6] text-muted-foreground"
          style={{ "--d": "700ms" } as CSSProperties}
        >
          {t("subtitle", { name })}
        </p>
        <div
          className="landing-fade mt-10 flex items-start gap-3 border-t border-border pt-6"
          style={{ "--d": "900ms" } as CSSProperties}
        >
          <ScanLine className="mt-0.5 size-5 shrink-0 text-primary-text" strokeWidth={1.5} />
          <div>
            <h2 className="text-[0.9375rem] font-medium">{t("scanTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("scanBody")}</p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[34rem]">
        <svg
          aria-hidden
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          className="landing-draw absolute inset-x-[6%] -top-[6%] bottom-[2%] h-[104%] w-[88%] text-foreground/20"
        >
          <path
            pathLength={1}
            d="M1 139V62C1 35 26 23 42 11c4-3 6-7 8-10 2 3 4 7 8 10 16 12 41 24 41 51v77"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <GlyphHandi className="relative" />
        <Docket
          className="landing-print absolute -bottom-12 -left-2 w-56 -rotate-3 max-sm:hidden sm:-left-12"
          innerClassName="px-5 pt-6 pb-5"
        >
          <figure aria-label={t("previewLabel")}>
            <div className="flex items-baseline justify-between text-sm">
              <span>
                <span className="sr-only">{t("previewTable")} </span>
                <DocketNumber prefix="T" value={d("07")} className="text-base" />
              </span>
              <span className="font-mono text-xs text-subtle tabular-nums">
                {t("previewOrder")} #{d("0214")}
              </span>
            </div>
            <ul className="docket-rule mt-4 space-y-2 pt-4 text-sm">
              {LINES.map((line) => (
                <li key={line.name} className="flex gap-3">
                  <span className="w-6 shrink-0 font-mono text-subtle tabular-nums">
                    {d(line.qty)}×
                  </span>
                  <span className="min-w-0">
                    {t(line.name)}
                    {line.note ? (
                      <span className="block text-xs text-subtle">{t(line.note)}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <div className="docket-rule mt-4 flex items-center justify-between gap-2 pt-4">
              <StatusPill kind="order" state="preparing" size="sm" />
              <span className="font-mono text-xs text-subtle tabular-nums">{t("previewSent")}</span>
            </div>
          </figure>
        </Docket>
      </div>
    </section>
  );
}
