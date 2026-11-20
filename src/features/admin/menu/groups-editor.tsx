"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { z } from "@/lib/zod";

import { IconButton } from "@/components/common/icon-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import type { ItemInput } from "../schemas";

type Group = ItemInput["groups"][number];
type Option = Group["options"][number];

const newOption = (): Option => ({
  name: "",
  nameBn: "",
  priceDelta: "0",
  isDefault: false,
  isAvailable: true,
});

/**
 * Modifier groups ("Spice level", "Add-ons"…) with min/max choices and
 * priced options. Prices are typed in taka and stored as poisha.
 */
export function GroupsEditor({
  groups,
  onChange,
  issues,
}: {
  groups: Group[];
  onChange: (groups: Group[]) => void;
  issues: z.core.$ZodIssue[];
}) {
  const t = useTranslations("admin.menu");
  const update = (i: number, patch: Partial<Group>) =>
    onChange(groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<Option>) =>
    update(gi, {
      options: groups[gi]!.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)),
    });
  const move = (from: number, to: number) => {
    const next = [...groups];
    const [g] = next.splice(from, 1);
    if (g) next.splice(to, 0, g);
    onChange(next);
  };
  const groupIssue = (gi: number) => {
    const msg = issues.find((i) => i.path[0] === "groups" && i.path[1] === gi)?.message;
    return msg === "minmax" || msg === "minOptions" || msg === "defaults"
      ? t(`groupIssue_${msg}`)
      : null;
  };

  return (
    <section aria-labelledby="groups-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="groups-title" className="font-medium">
          {t("groups")}
        </h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange([
              ...groups,
              { name: "", nameBn: "", minSelect: 0, maxSelect: 1, options: [newOption()] },
            ])
          }
        >
          <Plus aria-hidden />
          {t("addGroup")}
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noGroups")}</p>
      ) : null}

      {groups.map((g, gi) => {
        const label = g.name || t("groupN", { n: gi + 1 });
        const issue = groupIssue(gi);
        return (
          <fieldset
            key={g.id ?? `new-${gi}`}
            className="space-y-3 rounded-2xl border border-border p-4"
          >
            <legend className="sr-only">{label}</legend>
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  aria-label={t("groupName")}
                  placeholder={t("groupNamePlaceholder")}
                  value={g.name}
                  maxLength={60}
                  onChange={(e) => update(gi, { name: e.target.value })}
                />
                <Input
                  aria-label={t("groupNameBn")}
                  placeholder={t("nameBn")}
                  value={g.nameBn ?? ""}
                  maxLength={60}
                  lang="bn"
                  onChange={(e) => update(gi, { nameBn: e.target.value })}
                />
              </div>
              <IconButton
                size="icon-sm"
                label={t("up", { name: label })}
                disabled={gi === 0}
                onClick={() => move(gi, gi - 1)}
              >
                <ChevronUp aria-hidden />
              </IconButton>
              <IconButton
                size="icon-sm"
                label={t("down", { name: label })}
                disabled={gi === groups.length - 1}
                onClick={() => move(gi, gi + 1)}
              >
                <ChevronDown aria-hidden />
              </IconButton>
              <IconButton
                size="icon-sm"
                label={t("removeNamed", { name: label })}
                onClick={() => onChange(groups.filter((_, j) => j !== gi))}
              >
                <Trash2 aria-hidden />
              </IconButton>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                {t("minSelect")}
                <Input
                  type="number"
                  min={0}
                  max={20}
                  className="w-20"
                  value={g.minSelect}
                  onChange={(e) => update(gi, { minSelect: Number(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                {t("maxSelect")}
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-20"
                  value={g.maxSelect}
                  onChange={(e) => update(gi, { maxSelect: Number(e.target.value) })}
                />
              </label>
            </div>
            {issue ? <p className="text-sm text-ember">{issue}</p> : null}

            <ul className="space-y-2">
              {g.options.map((o, oi) => {
                const oLabel = o.name || t("optionN", { n: oi + 1 });
                return (
                  <li
                    key={o.id ?? `new-${oi}`}
                    className="grid gap-2 rounded-xl bg-muted/50 p-2 sm:grid-cols-[1fr_1fr_6rem_auto]"
                  >
                    <Input
                      aria-label={t("optionName")}
                      placeholder={t("optionNamePlaceholder")}
                      value={o.name}
                      maxLength={60}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                    />
                    <Input
                      aria-label={t("optionNameBn")}
                      placeholder={t("nameBn")}
                      value={o.nameBn ?? ""}
                      maxLength={60}
                      lang="bn"
                      onChange={(e) => updateOption(gi, oi, { nameBn: e.target.value })}
                    />
                    <Input
                      aria-label={t("optionPrice", { name: oLabel })}
                      inputMode="decimal"
                      value={o.priceDelta}
                      onChange={(e) => updateOption(gi, oi, { priceDelta: e.target.value })}
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex min-h-11 items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={o.isDefault}
                          onCheckedChange={(v) => updateOption(gi, oi, { isDefault: v === true })}
                        />
                        {t("default")}
                      </label>
                      <label className="flex min-h-11 items-center gap-1.5 text-sm">
                        <Checkbox
                          checked={o.isAvailable}
                          onCheckedChange={(v) => updateOption(gi, oi, { isAvailable: v === true })}
                        />
                        {t("available")}
                      </label>
                      <IconButton
                        size="icon-sm"
                        label={t("removeNamed", { name: oLabel })}
                        disabled={g.options.length === 1}
                        onClick={() =>
                          update(gi, { options: g.options.filter((_, j) => j !== oi) })
                        }
                      >
                        <Trash2 aria-hidden />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update(gi, { options: [...g.options, newOption()] })}
            >
              <Plus aria-hidden />
              {t("addOption")}
            </Button>
          </fieldset>
        );
      })}
    </section>
  );
}
