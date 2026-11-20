"use client";

import { Check, CreditCard, Smartphone, Wallet, Banknote } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { brand } from "@/config/brand";
import { localizeDigits } from "@/lib/digits";

/** Shared top bar of the mock guest app. */
function AppBar() {
  const locale = useLocale();
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 text-[0.8125rem]">
      <span className="font-display">{locale === "bn" ? brand.nameBn : brand.name}</span>
      <span className="rounded-sm border border-white/12 px-1.5 font-mono text-[0.75rem]">
        T<span className="opacity-50">·</span>
        {localizeDigits("07", locale === "bn" ? "bn" : "en")}
      </span>
    </div>
  );
}

export function ScanScreen() {
  const t = useTranslations("landing");
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-[#0d0c0b]">
      <div className="relative grid size-40 place-items-center">
        <div className="grid size-28 grid-cols-5 gap-1 rounded-md bg-[#f6ecd2] p-2">
          {"1101101011101011010110111".split("").map((c, i) => (
            <span key={i} className={c === "1" ? "rounded-[2px] bg-[#1f1b16]" : ""} />
          ))}
        </div>
        {(
          [
            "top-0 left-0 border-t-2 border-l-2",
            "top-0 right-0 border-t-2 border-r-2",
            "bottom-0 left-0 border-b-2 border-l-2",
            "bottom-0 right-0 border-b-2 border-r-2",
          ] as const
        ).map((c) => (
          <span key={c} className={`absolute size-7 rounded-[3px] border-[#e3a03c] ${c}`} />
        ))}
        <span className="landing-scanline absolute inset-x-3 h-0.5 rounded-full bg-[#e3a03c]" />
      </div>
      <p className="mt-6 text-[0.8125rem] text-white/70">{t("phoneScanning")}</p>
    </div>
  );
}

export function MenuScreen() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const items = ["previewItem1", "previewItem2", "previewItem3"] as const;
  return (
    <div className="flex h-full flex-col">
      <AppBar />
      <p className="px-4 pt-4 pb-2 font-display text-lg">{t("phoneMenu")}</p>
      <ul className="divide-y divide-white/8 px-4">
        {items.map((k, i) => (
          <li key={k} className="flex items-center gap-3 py-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
              <span className="size-8 rounded-full border border-white/15" />
            </span>
            <span className="min-w-0 flex-1 text-[0.8125rem]">{t(k)}</span>
            <span
              className={
                i === 0
                  ? "landing-press grid size-8 place-items-center rounded-md bg-[#e3a03c] text-[#1a1206]"
                  : "grid size-8 place-items-center rounded-md border border-white/12 text-white/70"
              }
            >
              +
            </span>
          </li>
        ))}
      </ul>
      <div className="landing-cart mx-3 mt-auto mb-4 flex items-center justify-between rounded-xl bg-[#efe9de] px-3 py-3 text-[0.8125rem] text-[#1f1b16]">
        <span className="font-medium">{t("phoneCart")}</span>
        <span className="font-mono">
          {t("phoneItems", { count: localizeDigits(3, locale === "bn" ? "bn" : "en") })}
        </span>
      </div>
    </div>
  );
}

export function CookingScreen() {
  const t = useTranslations("landing");
  return (
    <div className="flex h-full flex-col">
      <AppBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <svg viewBox="0 0 64 64" aria-hidden className="size-24">
          <g
            className="landing-steam"
            fill="none"
            stroke="#efe9de"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.7"
          >
            <path d="M24 18c-3-4 3-6 0-10" />
            <path d="M32 16c-3-4 3-6 0-10" />
            <path d="M40 18c-3-4 3-6 0-10" />
          </g>
          <path d="M18 30c-8 4-8 22 4 24h20c12-2 12-20 4-24Z" fill="#b07a32" />
          <ellipse cx="32" cy="29" rx="15" ry="3" fill="#e9d3a8" />
          <path d="M18 27c1-7 27-7 28 0Z" fill="#d39a45" />
          <ellipse cx="32" cy="57" rx="18" ry="2" fill="#e0664d" opacity="0.7" />
        </svg>
        <div>
          <p className="font-display text-xl">{t("phoneCooking")}</p>
          <p className="mt-1 font-mono text-[0.75rem] text-white/60">{t("phoneEta")}</p>
        </div>
        <div className="flex w-full gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={
                  i < 2
                    ? "block h-full bg-[#e3a03c]"
                    : i === 2
                      ? "landing-fill block h-full bg-[#e3a03c]"
                      : ""
                }
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BillScreen() {
  const t = useTranslations("landing");
  const tiles = [
    { k: "payBkash", icon: Smartphone },
    { k: "payNagad", icon: Wallet },
    { k: "payCard", icon: CreditCard },
    { k: "payCash", icon: Banknote },
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <AppBar />
      <p className="px-4 pt-4 pb-3 font-display text-lg">{t("phoneBill")}</p>
      <div className="grid grid-cols-2 gap-2 px-4">
        {tiles.map(({ k, icon: Icon }, i) => (
          <span
            key={k}
            className={
              i === 0
                ? "flex items-center gap-2 rounded-lg border border-[#e3a03c] bg-[#e3a03c]/10 px-3 py-3 text-[0.8125rem]"
                : "flex items-center gap-2 rounded-lg border border-white/10 px-3 py-3 text-[0.8125rem] text-white/70"
            }
          >
            <Icon className="size-4" strokeWidth={1.5} aria-hidden />
            {t(k)}
          </span>
        ))}
      </div>
      <div className="landing-paid mt-auto mb-6 flex flex-col items-center gap-2">
        <span className="grid size-12 place-items-center rounded-full bg-[#5cb88a] text-[#0d0c0b]">
          <Check className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <span className="text-[0.8125rem]">{t("phonePaid")}</span>
      </div>
    </div>
  );
}
