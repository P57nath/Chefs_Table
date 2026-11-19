"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SegmentedControl } from "@/components/common/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { Field } from "../field";
import { ImageUploader } from "../image/image-uploader";
import { ITEM_TAGS, itemSchema, type ItemInput } from "../schemas";
import { saveItem } from "../server/menu-actions";
import { useRun } from "../use-run";
import { GroupsEditor } from "./groups-editor";
import { emptyItemForm, toItemForm, type AdminCategory, type AdminItem } from "./types";

type TextKey = "name" | "nameBn" | "description" | "descriptionBn" | "price";

function ItemForm({
  initial,
  categories,
  onClose,
}: {
  initial: ItemInput;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.menu");
  const { run, pending } = useRun();
  const [form, setForm] = useState<ItemInput>(initial);
  const parsed = itemSchema.safeParse(form);
  const issues = parsed.success ? [] : parsed.error.issues;
  const bad = (k: string) => issues.some((i) => i.path[0] === k);
  const set = <K extends keyof ItemInput>(k: K, v: ItemInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const text = (k: TextKey) => ({
    value: form[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k, e.target.value),
  });

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!parsed.success) return;
        run(() => saveItem(form), { success: t("saved"), onDone: onClose });
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
        <ImageUploader
          label={t("photo")}
          value={form.imagePath}
          onChange={(p) => set("imagePath", p)}
          aspect={4 / 3}
          maxWidth={1200}
          prefix="item"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("nameEn")} error={bad("name") ? t("required") : null}>
            <Input {...text("name")} maxLength={80} aria-invalid={bad("name") || undefined} />
          </Field>
          <Field label={t("nameBn")}>
            <Input {...text("nameBn")} maxLength={80} lang="bn" />
          </Field>
          <Field label={t("descEn")}>
            <Textarea {...text("description")} maxLength={400} rows={3} />
          </Field>
          <Field label={t("descBn")}>
            <Textarea {...text("descriptionBn")} maxLength={400} rows={3} lang="bn" />
          </Field>
          <Field label={t("price")} error={bad("price") ? t("invalidPrice") : null}>
            <Input
              {...text("price")}
              inputMode="decimal"
              placeholder="250"
              aria-invalid={bad("price") || undefined}
            />
          </Field>
          <Field label={t("category")}>
            <select
              value={form.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("prepMinutes")} error={bad("prepMinutes") ? t("invalidPrep") : null}>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={form.prepMinutes}
              onChange={(e) => set("prepMinutes", Number(e.target.value))}
            />
          </Field>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("spice")}</span>
            <SegmentedControl<"0" | "1" | "2" | "3">
              label={t("spice")}
              value={String(form.spiceLevel) as "0" | "1" | "2" | "3"}
              onChange={(v) => set("spiceLevel", Number(v))}
              options={(["0", "1", "2", "3"] as const).map((v) => ({
                value: v,
                label: t(`spice_${v}`),
              }))}
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("tags")}</legend>
          <div className="flex flex-wrap gap-2">
            {ITEM_TAGS.map((tag) => {
              const on = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set("tags", on ? form.tags.filter((x) => x !== tag) : [...form.tags, tag])
                  }
                  className={cn(
                    "min-h-11 rounded-full border border-border px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on && "border-primary bg-primary/15 font-semibold",
                  )}
                >
                  {t(`tag_${tag}`)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-4">
          <span className="text-sm font-medium">{t("availableToday")}</span>
          <Switch checked={form.isAvailable} onCheckedChange={(v) => set("isAvailable", v)} />
        </label>
        <GroupsEditor groups={form.groups} onChange={(g) => set("groups", g)} issues={issues} />
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!parsed.success}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

/** Create / edit a dish in a right-hand sheet (full width on phones). */
export function ItemSheet({
  item,
  categoryId,
  categories,
  onClose,
}: {
  item: AdminItem | "new" | null;
  categoryId: string;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.menu");
  return (
    <Sheet open={item !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="space-y-1 border-b border-border p-5 pr-14">
          <SheetTitle className="font-display text-2xl font-semibold">
            {item === "new" ? t("addItem") : t("editItem")}
          </SheetTitle>
          <SheetDescription>{t("itemHint")}</SheetDescription>
        </div>
        {item ? (
          <ItemForm
            key={item === "new" ? "new" : item.id}
            initial={item === "new" ? emptyItemForm(categoryId) : toItemForm(item)}
            categories={categories}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
