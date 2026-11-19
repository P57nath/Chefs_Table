"use client";

import { ChefHat, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";

import { ItemImage } from "./item-image";
import { itemName, requiresSheet } from "./menu-model";
import type { MenuItem } from "./types";

interface SpecialsCarouselProps {
  items: MenuItem[];
  iconFor: (item: MenuItem) => string | null;
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, from: HTMLElement | null) => void;
}

/** Hero strip: "Chef’s specials" horizontal snap carousel. */
export function SpecialsCarousel({ items, iconFor, onOpen, onQuickAdd }: SpecialsCarouselProps) {
  const t = useTranslations("guest");
  const locale = useLocale();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="specials-title" className="grain relative space-y-3 pt-5 pb-2">
      <h2
        id="specials-title"
        className="mx-auto flex max-w-3xl items-center gap-2 px-4 font-display text-xl font-semibold"
      >
        <ChefHat className="size-5 text-primary-text" aria-hidden />
        {t("chefsSpecials")}
      </h2>
      <ul className="mx-auto flex max-w-3xl snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth px-4 pb-3 [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => {
          const name = itemName(item, locale);
          const soldOut = !item.is_available;
          return (
            <li
              key={item.id}
              data-item-card
              className="surface-raised relative w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div data-item-image>
                <ItemImage
                  name={name}
                  imagePath={item.image_path}
                  categoryIcon={iconFor(item)}
                  sizes="240px"
                  priority={i < 2}
                  className={soldOut ? "grayscale" : undefined}
                />
              </div>
              <div className="flex items-end gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display font-semibold">
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {name}
                    </button>
                  </h3>
                  {soldOut ? (
                    <p className="text-sm font-semibold text-muted-foreground">{t("soldOut")}</p>
                  ) : (
                    <MoneyText
                      minor={item.price_minor}
                      className="text-sm font-semibold text-primary-text"
                    />
                  )}
                </div>
                {soldOut ? null : (
                  <button
                    type="button"
                    onClick={(e) =>
                      requiresSheet(item)
                        ? onOpen(item)
                        : onQuickAdd(
                            item,
                            e.currentTarget.closest("li")?.querySelector("[data-item-image]") ??
                              null,
                          )
                    }
                    aria-label={
                      requiresSheet(item) ? t("customise", { name }) : t("addNamed", { name })
                    }
                    className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow outline-none focus-visible:ring-3 focus-visible:ring-ring/60 active:scale-90"
                  >
                    <Plus className="size-5" strokeWidth={2.5} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
