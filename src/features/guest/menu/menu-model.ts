import type { Locale } from "@/i18n/config";

import type { MenuItem, ModifierGroup } from "./types";

/** Localised text with English fallback. */
export function pick(en: string, bn: string | null | undefined, locale: Locale): string {
  return locale === "bn" && bn ? bn : en;
}

export const itemName = (item: { name: string; name_bn: string | null }, locale: Locale) =>
  pick(item.name, item.name_bn, locale);

export function itemDescription(item: MenuItem, locale: Locale): string | null {
  if (locale === "bn" && item.description_bn) return item.description_bn;
  return item.description;
}

/** Items with any required group open the detail sheet instead of quick-add. */
export function requiresSheet(item: MenuItem): boolean {
  return item.groups.some((g) => g.min_select > 0);
}

export function isChefSpecial(item: MenuItem): boolean {
  return item.tags.includes("chef_special");
}

export function isVeg(item: MenuItem): boolean {
  return item.tags.includes("veg");
}

/** Default selection: available `is_default` options, capped at each group's max. */
export function defaultSelection(item: MenuItem): string[] {
  return item.groups.flatMap((g) =>
    g.options
      .filter((o) => o.is_default && o.is_available)
      .slice(0, g.max_select)
      .map((o) => o.id),
  );
}

export type GroupProblem = { groupId: string; kind: "min" | "max"; limit: number };

/** Client mirror of place_order's modifier rules (the server stays the authority). */
export function validateSelection(item: MenuItem, selected: readonly string[]): GroupProblem[] {
  const chosen = new Set(selected);
  const problems: GroupProblem[] = [];
  for (const g of item.groups) {
    const count = g.options.filter((o) => chosen.has(o.id)).length;
    if (count < g.min_select) problems.push({ groupId: g.id, kind: "min", limit: g.min_select });
    if (count > g.max_select) problems.push({ groupId: g.id, kind: "max", limit: g.max_select });
  }
  return problems;
}

/** Toggle an option respecting radio (max 1) vs checkbox (max N) semantics. */
export function toggleOption(group: ModifierGroup, selected: readonly string[], optionId: string) {
  const inGroup = new Set(group.options.map((o) => o.id));
  const current = selected.filter((id) => inGroup.has(id));
  const others = selected.filter((id) => !inGroup.has(id));
  if (group.max_select === 1) {
    // Radio: re-tapping the chosen option clears it only if the group is optional.
    if (current.includes(optionId)) return group.min_select === 0 ? others : [...selected];
    return [...others, optionId];
  }
  if (current.includes(optionId)) return [...others, ...current.filter((id) => id !== optionId)];
  if (current.length >= group.max_select) return [...selected];
  return [...others, ...current, optionId];
}

/** Display-only price preview. The bill is always computed by Postgres. */
export function unitPricePreview(item: MenuItem, selected: readonly string[]): number {
  const chosen = new Set(selected);
  const delta = item.groups
    .flatMap((g) => g.options)
    .filter((o) => chosen.has(o.id))
    .reduce((sum, o) => sum + o.price_delta_minor, 0);
  return item.price_minor + delta;
}

/** Human labels for chosen modifiers, in group/option order. */
export function modifierLabels(item: MenuItem, selected: readonly string[], locale: Locale) {
  const chosen = new Set(selected);
  return item.groups.flatMap((g) =>
    g.options.filter((o) => chosen.has(o.id)).map((o) => pick(o.name, o.name_bn, locale)),
  );
}

// ---------------------------------------------------------------------------
// Search & filters
// ---------------------------------------------------------------------------

export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Every query word must appear as a substring or a loose subsequence (typo-tolerant). */
function wordScore(haystack: string, word: string): number {
  if (haystack.includes(word)) return haystack.startsWith(word) ? 3 : 2;
  if (word.length < 3) return 0;
  let i = 0;
  for (const ch of haystack) if (ch === word[i]) i++;
  return i === word.length ? 1 : 0;
}

export function searchItems(items: readonly MenuItem[], query: string): MenuItem[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [...items];
  const scored = items.flatMap((item) => {
    const names = normalize(`${item.name} ${item.name_bn ?? ""}`);
    const body = normalize(`${item.description ?? ""} ${item.description_bn ?? ""}`);
    let score = 0;
    for (const w of words) {
      const s = Math.max(wordScore(names, w) * 2, wordScore(body, w));
      if (s === 0) return [];
      score += s;
    }
    return [{ item, score }];
  });
  return scored.sort((a, b) => b.score - a.score || a.item.sort - b.item.sort).map((s) => s.item);
}

export interface MenuFilters {
  vegOnly: boolean;
  /** null = any spice level. */
  maxSpice: number | null;
}

export function applyFilters(items: readonly MenuItem[], f: MenuFilters): MenuItem[] {
  return items.filter(
    (i) => (!f.vegOnly || isVeg(i)) && (f.maxSpice === null || i.spice_level <= f.maxSpice),
  );
}
