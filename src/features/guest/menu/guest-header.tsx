"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { EmberMark } from "@/components/brand/logo";
import { IconButton } from "@/components/common/icon-button";
import { LanguageToggle } from "@/components/common/language-toggle";
import { Input } from "@/components/ui/input";

interface GuestHeaderProps {
  restaurantName: string;
  tableLabel: string;
  searching: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onSearchOpen: () => void;
  onSearchClose: () => void;
}

/** Sticky glass header: brand, table chip, language, search (turns into the search field). */
export function GuestHeader({
  restaurantName,
  tableLabel,
  searching,
  query,
  onQueryChange,
  onSearchOpen,
  onSearchClose,
}: GuestHeaderProps) {
  const t = useTranslations("guest");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  return (
    <header className="glass sticky top-0 z-30 border-b border-border">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
        {searching ? (
          <>
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && onSearchClose()}
              placeholder={t("searchPlaceholder")}
              aria-label={t("search")}
              className="h-11 flex-1 border-transparent bg-surface-2"
            />
            <IconButton label={t("closeSearch")} onClick={onSearchClose}>
              <X aria-hidden />
            </IconButton>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <EmberMark className="text-2xl" />
              <span className="truncate font-display text-lg font-semibold">{restaurantName}</span>
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground tabular-nums">
                <span className="sr-only">{t("table", { table: tableLabel })}</span>
                <span aria-hidden>{tableLabel}</span>
              </span>
            </div>
            <LanguageToggle />
            <IconButton label={t("search")} onClick={onSearchOpen}>
              <Search aria-hidden />
            </IconButton>
          </>
        )}
      </div>
    </header>
  );
}
