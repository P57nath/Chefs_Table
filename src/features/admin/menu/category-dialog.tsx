"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/features/guest/menu/category-style";
import { cn } from "@/lib/utils";

import { Field } from "../field";
import { categorySchema, type CategoryInput } from "../schemas";
import { saveCategory } from "../server/menu-actions";
import { useRun } from "../use-run";
import type { AdminCategory } from "./types";

function CategoryForm({
  category,
  onClose,
  onCreated,
}: {
  category: AdminCategory | "new";
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const t = useTranslations("admin.menu");
  const { run, pending } = useRun();
  const [form, setForm] = useState<CategoryInput>(
    category === "new"
      ? { name: "", nameBn: "", icon: "chef-hat" }
      : {
          id: category.id,
          name: category.name,
          nameBn: category.name_bn ?? "",
          icon: category.icon,
        },
  );
  const valid = categorySchema.safeParse(form).success;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        run(() => saveCategory(form), {
          success: t("saved"),
          onDone: (r) => {
            if (category === "new") onCreated(r.data.id);
            onClose();
          },
        });
      }}
      className="space-y-4"
    >
      <Field label={t("nameEn")}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          maxLength={40}
          autoFocus
        />
      </Field>
      <Field label={t("nameBn")}>
        <Input
          value={form.nameBn ?? ""}
          onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
          maxLength={40}
          lang="bn"
        />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("icon")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICON_NAMES.map((name) => (
            <label key={name} className="cursor-pointer" title={name}>
              <input
                type="radio"
                name="icon"
                value={name}
                checked={form.icon === name}
                onChange={() => setForm({ ...form, icon: name })}
                className="peer sr-only"
                aria-label={name}
              />
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-xl border border-border peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  form.icon === name && "border-primary bg-primary/15 text-primary-text",
                )}
              >
                <CategoryIcon icon={name} className="size-5" aria-hidden />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <DialogFooter className="gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={pending} disabled={!valid}>
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CategoryDialog({
  category,
  onClose,
  onCreated,
}: {
  category: AdminCategory | "new" | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const t = useTranslations("admin.menu");
  return (
    <Dialog open={category !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category === "new" ? t("addCategory") : t("editCategory")}</DialogTitle>
        </DialogHeader>
        {category ? (
          <CategoryForm
            key={category === "new" ? "new" : category.id}
            category={category}
            onClose={onClose}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
