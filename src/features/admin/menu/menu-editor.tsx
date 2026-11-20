"use client";

import { Archive, ArchiveRestore, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { IconButton } from "@/components/common/icon-button";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategoryIcon } from "@/features/guest/menu/category-style";
import { cn } from "@/lib/utils";

import { reorder, setCategoryActive } from "../server/menu-actions";
import { SortableList } from "../sortable-list";
import { useRun } from "../use-run";
import { CategoryDialog } from "./category-dialog";
import { ItemList } from "./item-list";
import type { AdminCategory, AdminItem } from "./types";

/** Two-pane menu editor: categories on the left, dishes of the selected category on the right. */
export function MenuEditor({
  categories,
  items,
}: {
  categories: AdminCategory[];
  items: AdminItem[];
}) {
  const t = useTranslations("admin.menu");
  const { run } = useRun();
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(categories[0]?.id ?? null);
  const [editing, setEditing] = useState<AdminCategory | "new" | null>(null);

  const visible = categories.filter((c) => showArchived || c.is_active);
  const selected = categories.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const countOf = (cid: string) => items.filter((i) => i.category_id === cid && i.is_active).length;

  if (categories.length === 0) {
    return (
      <>
        <EmptyState
          icon={UtensilsCrossed}
          title={t("emptyTitle")}
          body={t("emptyBody")}
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden />
              {t("addCategory")}
            </Button>
          }
        />
        <CategoryDialog
          category={editing}
          onClose={() => setEditing(null)}
          onCreated={setSelectedId}
        />
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
      <section aria-labelledby="cat-title" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="cat-title" className="font-medium">
            {t("categories")}
          </h2>
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            {t("addCategory")}
          </Button>
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          {t("showArchived")}
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
        </label>
        <SortableList
          items={visible}
          ariaLabel={t("categories")}
          labelOf={(c) => c.name}
          onCommit={(ids) => run(() => reorder("categories", ids))}
          rowClassName={(c) =>
            cn(
              c.id === selected?.id && "border-primary ring-1 ring-primary",
              !c.is_active && "opacity-60",
            )
          }
        >
          {(c) => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-current={c.id === selected?.id ? "true" : undefined}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <CategoryIcon
                  icon={c.icon}
                  className="size-5 shrink-0 text-primary-text"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{countOf(c.id)}</span>
              </button>
              <IconButton
                size="icon-sm"
                label={t("editNamed", { name: c.name })}
                onClick={() => setEditing(c)}
              >
                <Pencil aria-hidden />
              </IconButton>
              <IconButton
                size="icon-sm"
                label={
                  c.is_active
                    ? t("archiveNamed", { name: c.name })
                    : t("restoreNamed", { name: c.name })
                }
                onClick={() =>
                  run(() => setCategoryActive(c.id, !c.is_active), {
                    success: c.is_active ? t("archived") : t("restored"),
                  })
                }
              >
                {c.is_active ? <Archive aria-hidden /> : <ArchiveRestore aria-hidden />}
              </IconButton>
            </div>
          )}
        </SortableList>
      </section>

      {selected ? (
        <ItemList
          category={selected}
          categories={categories}
          items={items.filter(
            (i) => i.category_id === selected.id && (showArchived || i.is_active),
          )}
        />
      ) : null}

      <CategoryDialog
        category={editing}
        onClose={() => setEditing(null)}
        onCreated={setSelectedId}
      />
    </div>
  );
}
