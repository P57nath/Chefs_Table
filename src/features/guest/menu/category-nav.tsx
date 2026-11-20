"use client";

import { Flame, Leaf } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { Chip } from "@/components/common/chip";
import { localizeDigits } from "@/lib/digits";

import { pick, type MenuFilters } from "./menu-model";
import type { MenuCategory } from "./types";

interface CategoryNavProps {
  categories: MenuCategory[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filters: MenuFilters;
  onFiltersChange: (f: MenuFilters) => void;
}

const SPICE_CYCLE: (number | null)[] = [null, 0, 1, 2];

/** Sticky category chips (scroll-spy driven) + filter chips. */
export function CategoryNav({
  categories,
  activeId,
  onSelect,
  filters,
  onFiltersChange,
}: CategoryNavProps) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active chip visible inside the horizontal scroller.
  useEffect(() => {
    if (!activeId) return;
    const chip = listRef.current?.querySelector<HTMLElement>(`[data-cat="${activeId}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeId]);

  const nextSpice = () => {
    const i = SPICE_CYCLE.indexOf(filters.maxSpice);
    onFiltersChange({ ...filters, maxSpice: SPICE_CYCLE[(i + 1) % SPICE_CYCLE.length] ?? null });
  };

  return (
    <div className="bar-surface sticky top-16 z-20 border-b border-border">
      <nav
        aria-label={t("categories")}
        ref={listRef}
        className="mx-auto flex max-w-3xl [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-2.5 [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          size="sm"
          active={filters.vegOnly}
          onClick={() => onFiltersChange({ ...filters, vegOnly: !filters.vegOnly })}
          icon={<Leaf aria-hidden />}
        >
          {t("vegOnly")}
        </Chip>
        <Chip
          size="sm"
          active={filters.maxSpice !== null}
          onClick={nextSpice}
          icon={<Flame aria-hidden />}
          title={t("spiceLabel")}
        >
          {filters.maxSpice === null
            ? t("spiceAny")
            : t("spiceMax", { level: localizeDigits(filters.maxSpice, locale) })}
        </Chip>
        <span aria-hidden className="my-1 w-px shrink-0 bg-border" />
        {categories.map((c) => (
          <Chip
            key={c.id}
            data-cat={c.id}
            size="sm"
            active={activeId === c.id}
            aria-current={activeId === c.id ? "true" : undefined}
            onClick={() => onSelect(c.id)}
          >
            {pick(c.name, c.name_bn, locale)}
          </Chip>
        ))}
      </nav>
    </div>
  );
}
