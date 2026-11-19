"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MouseEvent } from "react";

import { MoneyText } from "@/components/common/money-text";
import { cn } from "@/lib/utils";

import { ItemImage } from "./item-image";
import { ItemTags } from "./item-tags";
import { itemDescription, itemName, requiresSheet } from "./menu-model";
import type { MenuItem } from "./types";

interface ItemCardProps {
  item: MenuItem;
  categoryIcon: string | null;
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, from: HTMLElement | null) => void;
  priority?: boolean;
}

/**
 * Menu row: text left, 4:3 image right with a "+" quick-add. Tapping the card
 * opens the detail sheet. Items with required options always go via the sheet.
 */
export function ItemCard({ item, categoryIcon, onOpen, onQuickAdd, priority }: ItemCardProps) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const name = itemName(item, locale);
  const description = itemDescription(item, locale);
  const soldOut = !item.is_available;

  function onPlus(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (requiresSheet(item)) onOpen(item);
    else
      onQuickAdd(
        item,
        e.currentTarget.closest("[data-item-card]")?.querySelector("[data-item-image]") ?? null,
      );
  }

  return (
    <article
      data-item-card
      data-sold-out={soldOut || undefined}
      className={cn(
        "surface-raised relative flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors",
        soldOut ? "opacity-60" : "hover:bg-[color-mix(in_oklch,var(--card),var(--foreground)_3%)]",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <h3 className="font-display text-[1.0625rem] leading-snug font-semibold">
          {/* Stretched button: the whole card opens the sheet. */}
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {name}
          </button>
        </h3>
        {locale === "bn" && item.name_bn ? (
          <p className="-mt-1 text-xs text-muted-foreground">{item.name}</p>
        ) : null}
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <ItemTags item={item} />
        <div className="mt-auto flex items-center gap-2 pt-1">
          <MoneyText minor={item.price_minor} className="font-semibold text-primary-text" />
          {soldOut ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {t("soldOut")}
            </span>
          ) : null}
        </div>
      </div>
      <div className="relative w-28 shrink-0 self-start sm:w-32" data-item-image>
        <ItemImage
          name={name}
          imagePath={item.image_path}
          categoryIcon={categoryIcon}
          sizes="128px"
          priority={priority}
          className={cn("rounded-xl", soldOut && "grayscale")}
        />
        {soldOut ? null : (
          <button
            type="button"
            onClick={onPlus}
            aria-label={requiresSheet(item) ? t("customise", { name }) : t("addNamed", { name })}
            className="absolute -right-1.5 -bottom-1.5 z-10 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-card transition-transform outline-none focus-visible:ring-ring/60 active:scale-90"
          >
            <Plus className="size-5" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}
