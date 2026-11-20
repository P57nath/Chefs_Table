import { Flame, Leaf, Sparkles, Star, ChefHat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { localizeDigits } from "@/lib/digits";

import type { MenuItem } from "./types";

const pill =
  "inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-medium [&_svg]:size-3.5";

/** Veg 🌿, Spicy 🌶 × level, New, Bestseller, Chef’s special. */
export function ItemTags({ item, max = 3 }: { item: MenuItem; max?: number }) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const tags: React.ReactNode[] = [];

  if (item.tags.includes("veg"))
    tags.push(
      <span key="veg" className={`${pill} bg-success/15 text-foreground`}>
        <Leaf className="text-success" aria-hidden />
        {t("tagVeg")}
      </span>,
    );
  if (item.spice_level > 0)
    tags.push(
      <span
        key="spice"
        className={`${pill} bg-ember/12 text-foreground`}
        aria-label={t("spicy", { level: localizeDigits(item.spice_level, locale) })}
        role="img"
      >
        {Array.from({ length: item.spice_level }, (_, i) => (
          <Flame key={i} className="-mx-0.5 text-ember" aria-hidden />
        ))}
      </span>,
    );
  if (item.tags.includes("chef_special"))
    tags.push(
      <span key="chef" className={`${pill} bg-primary/15 text-foreground`}>
        <ChefHat className="text-primary-text" aria-hidden />
        {t("tagChefSpecial")}
      </span>,
    );
  if (item.tags.includes("new"))
    tags.push(
      <span key="new" className={`${pill} bg-info/15 text-foreground`}>
        <Sparkles className="text-info" aria-hidden />
        {t("tagNew")}
      </span>,
    );
  if (item.tags.includes("bestseller"))
    tags.push(
      <span key="best" className={`${pill} bg-violet/15 text-foreground`}>
        <Star className="text-violet" aria-hidden />
        {t("tagBestseller")}
      </span>,
    );

  if (tags.length === 0) return null;
  return <div className="flex flex-wrap gap-1.5">{tags.slice(0, max)}</div>;
}
