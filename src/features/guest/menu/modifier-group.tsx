"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatMoney } from "@/lib/money";
import { localizeDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

import { pick } from "./menu-model";
import type { ModifierGroup as Group } from "./types";

interface ModifierGroupProps {
  group: Group;
  selected: readonly string[];
  onToggle: (optionId: string) => void;
  /** Shown after a failed "Add" when the group's minimum isn't met. */
  invalid: boolean;
}

/** Radio cards when max = 1, checkbox cards otherwise; "Required" badge and min/max hint. */
export function ModifierGroupField({ group, selected, onToggle, invalid }: ModifierGroupProps) {
  const t = useTranslations("guest");
  const locale = useLocale();
  const radio = group.max_select === 1;
  const chosen = group.options.filter((o) => selected.includes(o.id)).length;
  const full = !radio && chosen >= group.max_select;
  const n = (v: number) => localizeDigits(v, locale);
  const hint = radio
    ? t("chooseOne")
    : group.min_select > 0
      ? t("chooseBetween", { min: n(group.min_select), max: n(group.max_select) })
      : t("chooseUpTo", { max: n(group.max_select) });
  const name = pick(group.name, group.name_bn, locale);

  return (
    <fieldset
      id={`group-${group.id}`}
      aria-invalid={invalid || undefined}
      className={cn(
        "space-y-2 rounded-2xl border p-3 transition-colors",
        invalid ? "border-ember bg-ember/5" : "border-transparent",
      )}
    >
      <legend className="flex w-full items-center justify-between gap-2 px-0.5">
        <span className="font-medium">{name}</span>
        <span
          className={cn(
            "rounded-sm px-2 py-0.5 text-xs font-medium",
            group.min_select > 0
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {group.min_select > 0 ? t("required") : t("optional")}
        </span>
      </legend>
      <p
        className={cn(
          "px-0.5 text-sm",
          invalid ? "font-medium text-ember" : "text-muted-foreground",
        )}
      >
        {invalid ? t("pleaseChoose", { group: name }) : hint}
      </p>
      <div role={radio ? "radiogroup" : "group"} aria-label={name} className="space-y-2">
        {group.options.map((o) => {
          const isOn = selected.includes(o.id);
          const disabled = !o.is_available || (full && !isOn);
          return (
            <button
              key={o.id}
              type="button"
              role={radio ? "radio" : "checkbox"}
              aria-checked={isOn}
              disabled={disabled}
              onClick={() => onToggle(o.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-45",
                isOn ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-muted",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center border-2 transition-colors",
                  radio ? "rounded-full" : "rounded-md",
                  isOn
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50",
                )}
              >
                {isOn ? (
                  radio ? (
                    <span className="size-2 rounded-full bg-primary-foreground" />
                  ) : (
                    <Check className="size-3.5" strokeWidth={3} />
                  )
                ) : null}
              </span>
              <span className="flex-1">
                {pick(o.name, o.name_bn, locale)}
                {!o.is_available ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("optionUnavailable")}
                  </span>
                ) : null}
              </span>
              {o.price_delta_minor > 0 ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  +{formatMoney(o.price_delta_minor, locale)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
