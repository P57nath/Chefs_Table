"use client";

import {
  Archive,
  ArchiveRestore,
  Copy,
  ImageOff,
  Pencil,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { MoneyText } from "@/components/common/money-text";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { menuImageUrl } from "@/lib/storage";

import { duplicateItem, reorder, setItemActive, setItemAvailable } from "../server/menu-actions";
import { SortableList } from "../sortable-list";
import { useRun } from "../use-run";
import { ItemSheet } from "./item-sheet";
import type { AdminCategory, AdminItem } from "./types";

function Thumb({ path }: { path: string | null }) {
  const url = menuImageUrl(path);
  return (
    <span className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
      {url ? (
        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <ImageOff className="size-4" aria-hidden />
      )}
    </span>
  );
}

/** Dishes of one category: reorder, sold-out switch, edit, duplicate, archive. */
export function ItemList({
  category,
  categories,
  items,
}: {
  category: AdminCategory;
  categories: AdminCategory[];
  items: AdminItem[];
}) {
  const t = useTranslations("admin.menu");
  const { run } = useRun();
  const [editing, setEditing] = useState<AdminItem | "new" | null>(null);

  return (
    <section aria-labelledby="items-title" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="items-title" className="truncate font-medium">
          {category.name}
        </h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("addItem")}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={t("noItemsTitle")} body={t("noItemsBody")} />
      ) : (
        <SortableList
          items={items}
          ariaLabel={t("itemsIn", { name: category.name })}
          labelOf={(i) => i.name}
          onCommit={(ids) => run(() => reorder("items", ids))}
          rowClassName={(i) => (i.is_active ? undefined : "opacity-60")}
        >
          {(item) => (
            <div className="flex flex-wrap items-center gap-3 py-2 pr-1">
              <Thumb path={item.image_path} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  <MoneyText minor={item.price_minor} />
                  {item.modifier_groups.length > 0 ? (
                    <span>· {t("groupsCount", { count: item.modifier_groups.length })}</span>
                  ) : null}
                  {!item.is_active ? <span>· {t("archivedBadge")}</span> : null}
                </p>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <Switch
                  checked={item.is_available}
                  onCheckedChange={(v) =>
                    run(() => setItemAvailable(item.id, v), {
                      success: v
                        ? t("backOn", { name: item.name })
                        : t("soldOut", { name: item.name }),
                    })
                  }
                  aria-label={t("availableNamed", { name: item.name })}
                />
                <span className="hidden sm:inline">
                  {item.is_available ? t("available") : t("soldOutShort")}
                </span>
              </label>
              <div className="flex">
                <IconButton
                  size="icon-sm"
                  label={t("editNamed", { name: item.name })}
                  onClick={() => setEditing(item)}
                >
                  <Pencil aria-hidden />
                </IconButton>
                <IconButton
                  size="icon-sm"
                  label={t("duplicateNamed", { name: item.name })}
                  onClick={() => run(() => duplicateItem(item.id), { success: t("duplicated") })}
                >
                  <Copy aria-hidden />
                </IconButton>
                <IconButton
                  size="icon-sm"
                  label={
                    item.is_active
                      ? t("archiveNamed", { name: item.name })
                      : t("restoreNamed", { name: item.name })
                  }
                  onClick={() =>
                    run(() => setItemActive(item.id, !item.is_active), {
                      success: item.is_active ? t("archived") : t("restored"),
                    })
                  }
                >
                  {item.is_active ? <Archive aria-hidden /> : <ArchiveRestore aria-hidden />}
                </IconButton>
              </div>
            </div>
          )}
        </SortableList>
      )}

      <ItemSheet
        item={editing}
        categoryId={category.id}
        categories={categories}
        onClose={() => setEditing(null)}
      />
    </section>
  );
}
