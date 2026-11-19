"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Stepper } from "@/components/common/stepper";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { localizeDigits } from "@/lib/digits";
import { formatMoney } from "@/lib/money";

import { ItemImage } from "./item-image";
import { ItemTags } from "./item-tags";
import {
  defaultSelection,
  itemDescription,
  itemName,
  toggleOption,
  unitPricePreview,
  validateSelection,
} from "./menu-model";
import { ModifierGroupField } from "./modifier-group";
import type { MenuItem } from "./types";

const NOTE_MAX = 200;

export interface ItemSheetSubmit {
  item: MenuItem;
  quantity: number;
  modifierOptionIds: string[];
  note: string;
}

interface ItemSheetProps {
  item: MenuItem | null;
  categoryIcon: string | null;
  onClose: () => void;
  onAdd: (value: ItemSheetSubmit) => void;
  /** Ordering disabled (e.g. table not joined yet / cart frozen). */
  disabled?: boolean;
}

/** Bottom sheet (drag to dismiss) with options, instructions, quantity and live line total. */
export function ItemSheet({ item, categoryIcon, onClose, onAdd, disabled }: ItemSheetProps) {
  return (
    <Drawer open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-xl">
        {item ? (
          <ItemSheetBody
            key={item.id}
            item={item}
            categoryIcon={categoryIcon}
            onAdd={onAdd}
            disabled={disabled}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function ItemSheetBody({
  item,
  categoryIcon,
  onAdd,
  disabled,
}: {
  item: MenuItem;
  categoryIcon: string | null;
  onAdd: (value: ItemSheetSubmit) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>(() => defaultSelection(item));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const problems = validateSelection(item, selected);
  const invalidGroups = new Set(problems.map((p) => p.groupId));
  const lineTotal = unitPricePreview(item, selected) * quantity;
  const name = itemName(item, locale);
  const description = itemDescription(item, locale);
  const soldOut = !item.is_available;

  function submit() {
    if (problems.length > 0) {
      setShowErrors(true);
      document
        .getElementById(`group-${problems[0]?.groupId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd({ item, quantity, modifierOptionIds: selected, note: note.trim() });
  }

  return (
    <div className="flex max-h-[85dvh] flex-col">
      <div className="overflow-y-auto overscroll-contain px-4 pb-4">
        <ItemImage
          name={name}
          imagePath={item.image_path}
          categoryIcon={categoryIcon}
          sizes="(max-width: 640px) 100vw, 576px"
          variant="hero"
          className="mt-2 rounded-2xl"
        />
        <div className="space-y-2 pt-4">
          <DrawerTitle className="font-display text-2xl font-semibold">{name}</DrawerTitle>
          {locale === "bn" && item.name_bn ? (
            <p className="-mt-1 text-sm text-muted-foreground">{item.name}</p>
          ) : null}
          <DrawerDescription className="text-base text-muted-foreground">
            {description ?? ""}
          </DrawerDescription>
          <ItemTags item={item} max={5} />
        </div>

        <div className="mt-4 space-y-3">
          {item.groups.map((g) => (
            <ModifierGroupField
              key={g.id}
              group={g}
              selected={selected}
              invalid={showErrors && invalidGroups.has(g.id)}
              onToggle={(id) => setSelected((s) => toggleOption(g, s, id))}
            />
          ))}
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="font-semibold">{t("instructions")}</span>
          <Textarea
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder={t("instructionsPlaceholder")}
            rows={2}
          />
          <span className="block text-right text-xs text-muted-foreground tabular-nums">
            {localizeDigits(`${note.length}/${NOTE_MAX}`, locale)}
          </span>
        </label>
      </div>

      <div className="pb-safe flex items-center gap-3 border-t border-border bg-popover px-4 pt-3">
        <Stepper value={quantity} onChange={setQuantity} itemName={name} />
        <Button size="xl" className="flex-1" disabled={soldOut || disabled} onClick={submit}>
          {soldOut ? t("soldOut") : t("addToCart", { price: formatMoney(lineTotal, locale) })}
        </Button>
      </div>
    </div>
  );
}
