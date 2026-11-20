"use client";

import { useLocale } from "next-intl";

import { ItemCard } from "./item-card";
import { pick } from "./menu-model";
import type { MenuCategory, MenuItem } from "./types";

interface MenuSectionsProps {
  sections: { category: MenuCategory; items: MenuItem[] }[];
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, from: HTMLElement | null) => void;
}

/** Category sections; ids `cat-<id>` drive the scroll-spy chips. */
export function MenuSections({ sections, onOpen, onQuickAdd }: MenuSectionsProps) {
  const locale = useLocale();
  return (
    <div className="space-y-8 px-4 pt-5 pb-8">
      {sections.map(({ category, items }, si) => (
        <section
          key={category.id}
          id={`cat-${category.id}`}
          aria-labelledby={`h-${category.id}`}
          className="scroll-mt-32 space-y-3"
        >
          <h2 id={`h-${category.id}`} className="font-display text-xl font-medium">
            {pick(category.name, category.name_bn, locale)}
          </h2>
          <ul className="-mx-3 divide-y divide-border">
            {items.map((item, ii) => (
              <li key={item.id}>
                <ItemCard
                  item={item}
                  categoryIcon={category.icon}
                  onOpen={onOpen}
                  onQuickAdd={onQuickAdd}
                  priority={si === 0 && ii < 2}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
