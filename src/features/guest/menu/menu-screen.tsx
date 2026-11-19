"use client";

import { useQuery } from "@tanstack/react-query";
import { SearchX, UtensilsCrossed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonList, SkeletonMenuItem } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { CartBar } from "@/features/guest/cart/cart-bar";
import { CartSheet } from "@/features/guest/cart/cart-sheet";
import { useCart } from "@/features/guest/cart/cart-store";
import { FlyToCartProvider, useFlyToCart } from "@/features/guest/cart/fly-to-cart";
import { useGuestSession } from "@/features/guest/session/guest-session";
import { asAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { CategoryNav } from "./category-nav";
import { fetchMenu } from "./fetch-menu";
import { GuestHeader } from "./guest-header";
import { ItemCard } from "./item-card";
import { ItemSheet, type ItemSheetSubmit } from "./item-sheet";
import { MenuSections } from "./menu-sections";
import { SpecialsCarousel } from "./specials-carousel";
import {
  applyFilters,
  defaultSelection,
  isChefSpecial,
  itemName,
  modifierLabels,
  searchItems,
  unitPricePreview,
  type MenuFilters,
} from "./menu-model";
import type { MenuData, MenuItem } from "./types";
import { useScrollSpy } from "./use-scroll-spy";

const NO_FILTERS: MenuFilters = { vegOnly: false, maxSpice: null };

export function MenuScreen({ initialMenu }: { initialMenu: MenuData | null }) {
  return (
    <FlyToCartProvider>
      <MenuScreenInner initialMenu={initialMenu} />
    </FlyToCartProvider>
  );
}

function MenuScreenInner({ initialMenu }: { initialMenu: MenuData | null }) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const { table, poll } = useGuestSession();
  const rid = table.restaurant_id;
  const addLine = useCart((s) => s.add);
  const frozen = useCart((s) => s.awaitingRetry);
  const { fly } = useFlyToCart();

  const menu = useQuery({
    queryKey: qk.menu(rid),
    queryFn: () => fetchMenu(getBrowserSupabase(), rid),
    initialData: initialMenu ?? undefined,
    initialDataUpdatedAt: 0, // server copy may be up to 60 s old: refresh sold-out state now
    refetchInterval: poll,
  });

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MenuFilters>(NO_FILTERS);
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const data = menu.data;
  const iconByCategory = useMemo(
    () => new Map((data?.categories ?? []).map((c) => [c.id, c.icon])),
    [data],
  );
  const iconFor = (item: MenuItem) => iconByCategory.get(item.category_id) ?? null;
  const filtered = useMemo(() => applyFilters(data?.items ?? [], filters), [data, filters]);
  const sections = useMemo(
    () =>
      (data?.categories ?? [])
        .map((c) => ({ category: c, items: filtered.filter((i) => i.category_id === c.id) }))
        .filter((s) => s.items.length > 0),
    [data, filtered],
  );
  const specials = useMemo(
    () =>
      filtered
        .filter(isChefSpecial)
        .sort((a, b) => Number(b.is_available) - Number(a.is_available)),
    [filtered],
  );
  const soldOutIds = useMemo(
    () => new Set((data?.items ?? []).filter((i) => !i.is_available).map((i) => i.id)),
    [data],
  );
  const results = useMemo(
    () => (query.trim() ? searchItems(filtered, query) : []),
    [filtered, query],
  );
  const { active, scrollTo } = useScrollSpy(sections.map((s) => `cat-${s.category.id}`));

  function add(item: MenuItem, opts: Omit<ItemSheetSubmit, "item">, from: HTMLElement | null) {
    const name = itemName(item, locale);
    // The cart updates immediately (a fast "order now" must include every item);
    // the fly animation is purely visual and only bumps the bar when it lands.
    addLine({
      menuItemId: item.id,
      name: item.name,
      nameBn: item.name_bn,
      unitPriceMinor: unitPricePreview(item, opts.modifierOptionIds),
      quantity: opts.quantity,
      modifierOptionIds: opts.modifierOptionIds,
      modifierLabels: {
        en: modifierLabels(item, opts.modifierOptionIds, "en"),
        bn: modifierLabels(item, opts.modifierOptionIds, "bn"),
      },
      note: opts.note,
      imagePath: item.image_path,
      categoryId: item.category_id,
    });
    fly(from);
    toast.success(t("added", { name }), { duration: 1600 });
  }

  const quickAdd = (item: MenuItem, from: HTMLElement | null) =>
    add(item, { quantity: 1, modifierOptionIds: defaultSelection(item), note: "" }, from);

  const filtersOn = filters.vegOnly || filters.maxSpice !== null;
  let body: React.ReactNode;

  if (!data && menu.isPending) {
    body = (
      <SkeletonList
        label={t("connecting")}
        count={5}
        item={SkeletonMenuItem}
        className="px-4 pt-4"
      />
    );
  } else if (!data) {
    body = (
      <ErrorState
        title={t("menuErrorTitle")}
        variant={asAppError(menu.error).network ? "offline" : "error"}
        onRetry={() => void menu.refetch()}
        retrying={menu.isFetching}
      />
    );
  } else if (data.items.length === 0) {
    body = (
      <EmptyState icon={UtensilsCrossed} title={t("emptyMenuTitle")} body={t("emptyMenuBody")} />
    );
  } else if (searching && query.trim()) {
    body =
      results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t("noResults", { query: query.trim() })}
          body={t("noResultsHint")}
          action={
            filtersOn ? (
              <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                {t("clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3 px-4 py-4">
          {results.map((item) => (
            <li key={item.id}>
              <ItemCard
                item={item}
                categoryIcon={iconFor(item)}
                onOpen={setOpenItem}
                onQuickAdd={quickAdd}
              />
            </li>
          ))}
        </ul>
      );
  } else {
    body = (
      <>
        {!filtersOn ? (
          <SpecialsCarousel
            items={specials}
            iconFor={iconFor}
            onOpen={setOpenItem}
            onQuickAdd={quickAdd}
          />
        ) : null}
        <CategoryNav
          categories={sections.map((s) => s.category)}
          activeId={active?.replace(/^cat-/, "") ?? null}
          onSelect={(id) => scrollTo(`cat-${id}`)}
          filters={filters}
          onFiltersChange={setFilters}
        />
        {sections.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("noResultsFiltered")}
            body={t("noResultsHint")}
            action={
              <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <MenuSections sections={sections} onOpen={setOpenItem} onQuickAdd={quickAdd} />
        )}
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-28">
      <GuestHeader
        restaurantName={table.restaurant_name}
        tableLabel={table.table_label}
        searching={searching}
        query={query}
        onQueryChange={setQuery}
        onSearchOpen={() => setSearching(true)}
        onSearchClose={() => {
          setSearching(false);
          setQuery("");
        }}
      />
      <main id="main" className="mx-auto max-w-3xl">
        {body}
      </main>
      <ItemSheet
        item={openItem}
        categoryIcon={openItem ? iconFor(openItem) : null}
        disabled={frozen}
        onClose={() => setOpenItem(null)}
        onAdd={(v) => {
          setOpenItem(null);
          add(v.item, v, null);
        }}
      />
      <CartBar onOpen={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} soldOutIds={soldOutIds} />
    </div>
  );
}
