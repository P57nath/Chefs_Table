"use client";

import {
  AnimatePresence,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Docket, DocketNumber } from "@/components/brand/docket";
import { localizeDigits } from "@/lib/digits";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { BillScreen, CookingScreen, MenuScreen, ScanScreen } from "./phone-screens";

const STEPS = [
  { title: "storyStep1Title", body: "storyStep1Body", Screen: ScanScreen },
  { title: "storyStep2Title", body: "storyStep2Body", Screen: MenuScreen },
  { title: "storyStep3Title", body: "storyStep3Body", Screen: CookingScreen },
  { title: "storyStep4Title", body: "storyStep4Body", Screen: BillScreen },
] as const;

/**
 * Pinned scrollytelling: the section is four screens tall, the stage sticks,
 * and scroll progress walks a phone through scan → order → dum → pay while the
 * step list and its rail follow. At "Sealed on the dum" a kitchen docket prints
 * out from behind the phone.
 */
export function OrderStory() {
  const t = useTranslations("landing");
  const locale = useLocale() === "bn" ? "bn" : "en";
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rail = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const tilt = useTransform(scrollYProgress, [0, 0.5, 1], [-6, 0, 6]);
  useMotionValueEvent(scrollYProgress, "change", (v) =>
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)))),
  );
  const Screen = STEPS[step]!.Screen;
  const d = (v: string | number) => localizeDigits(v, locale);

  return (
    <section ref={ref} aria-labelledby="story-title" className="relative h-[400svh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 sm:px-6 md:grid-cols-[1fr_1fr] lg:gap-16 lg:px-8">
          <div className="order-2 md:order-1">
            <h2
              id="story-title"
              className="font-display text-[1.75rem] leading-[1.1] font-normal tracking-[-0.01em] sm:text-[2.75rem]"
            >
              {t("storyTitle")}
            </h2>
            <div className="relative mt-8 pl-6 sm:mt-12">
              <span aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-border" />
              <m.span
                aria-hidden
                style={{ scaleY: rail }}
                className="absolute top-0 bottom-0 left-0 w-px origin-top bg-primary"
              />
              <ol className="space-y-5 sm:space-y-8">
                {STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "transition-colors duration-300 [&_h3]:transition-colors [&_p]:transition-colors",
                      i === step ? "" : "[&_h3]:text-subtle [&_p]:text-subtle",
                      i !== step && "max-md:hidden",
                    )}
                  >
                    <span className="font-mono text-xs text-subtle tabular-nums">
                      {d(String(i + 1).padStart(2, "0"))}
                    </span>
                    <h3 className="mt-1 text-lg font-medium sm:text-xl">{t(s.title)}</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground sm:text-[0.9375rem]">
                      {t(s.body)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="relative order-1 mx-auto md:order-2">
            {/* the kitchen docket prints out from behind the phone */}
            <m.div
              aria-hidden
              initial={false}
              animate={
                step >= 2 ? { x: "80%", rotate: 5, opacity: 1 } : { x: "0%", rotate: 0, opacity: 0 }
              }
              transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
              className="absolute top-16 right-0 z-0 w-52"
            >
              <Docket edge="both" innerClassName="px-4 py-5">
                <div className="flex items-baseline justify-between">
                  <DocketNumber prefix="T" value={d("07")} />
                  <span className="font-mono text-[0.6875rem] text-subtle">#{d("0214")}</span>
                </div>
                <ul className="docket-rule mt-3 space-y-1.5 pt-3 text-[0.8125rem]">
                  <li>
                    <span className="font-mono text-subtle">{d(2)}×</span> {t("previewItem1")}
                  </li>
                  <li>
                    <span className="font-mono text-subtle">{d(1)}×</span> {t("previewItem2")}
                  </li>
                  <li>
                    <span className="font-mono text-subtle">{d(3)}×</span> {t("previewItem3")}
                  </li>
                </ul>
              </Docket>
            </m.div>

            <m.div
              aria-hidden
              style={{ rotate: tilt }}
              className="relative z-10 h-[min(64svh,560px)] w-[min(76vw,290px)] rounded-[2.5rem] border border-white/10 bg-[#1a1918] p-2.5 shadow-float motion-reduce:!transform-none sm:w-[300px]"
            >
              <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#141312] text-[#efe9de]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <m.div
                    key={step}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.96 }}
                    transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                    className="absolute inset-0"
                  >
                    <Screen />
                  </m.div>
                </AnimatePresence>
              </div>
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}
