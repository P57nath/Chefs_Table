import { describe, expect, it } from "vitest";

import {
  applyFilters,
  defaultSelection,
  modifierLabels,
  requiresSheet,
  searchItems,
  toggleOption,
  unitPricePreview,
  validateSelection,
} from "@/features/guest/menu/menu-model";
import type { MenuItem, ModifierGroup } from "@/features/guest/menu/types";

const patty: ModifierGroup = {
  id: "g-patty",
  name: "Patty",
  name_bn: "প্যাটি",
  min_select: 1,
  max_select: 1,
  sort: 1,
  options: [
    {
      id: "single",
      name: "Single",
      name_bn: "সিঙ্গেল",
      price_delta_minor: 0,
      is_default: true,
      is_available: true,
      sort: 1,
    },
    {
      id: "double",
      name: "Double",
      name_bn: "ডাবল",
      price_delta_minor: 15000,
      is_default: false,
      is_available: true,
      sort: 2,
    },
  ],
};

const extras: ModifierGroup = {
  id: "g-extras",
  name: "Extras",
  name_bn: null,
  min_select: 0,
  max_select: 2,
  sort: 2,
  options: [
    {
      id: "cheese",
      name: "Cheddar cheese",
      name_bn: "চেডার চিজ",
      price_delta_minor: 6000,
      is_default: false,
      is_available: true,
      sort: 1,
    },
    {
      id: "egg",
      name: "Fried egg",
      name_bn: null,
      price_delta_minor: 4000,
      is_default: false,
      is_available: true,
      sort: 2,
    },
    {
      id: "jalapeno",
      name: "Jalapeños",
      name_bn: null,
      price_delta_minor: 3000,
      is_default: false,
      is_available: true,
      sort: 3,
    },
  ],
};

function item(partial: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "burger",
    category_id: "grill",
    name: "Ember Smash Burger",
    name_bn: "এম্বার স্ম্যাশ বার্গার",
    description: "Smashed beef patty, house pickles",
    description_bn: null,
    price_minor: 45000,
    image_path: null,
    tags: [],
    spice_level: 1,
    prep_minutes: 15,
    is_available: true,
    sort: 1,
    groups: [patty, extras],
    ...partial,
  };
}

describe("modifier rules (client mirror of place_order)", () => {
  it("requires the sheet when any group is mandatory", () => {
    expect(requiresSheet(item())).toBe(true);
    expect(requiresSheet(item({ groups: [extras] }))).toBe(false);
  });

  it("preselects available defaults", () => {
    expect(defaultSelection(item())).toEqual(["single"]);
  });

  it("validates min and max per group", () => {
    expect(validateSelection(item(), [])).toEqual([{ groupId: "g-patty", kind: "min", limit: 1 }]);
    expect(validateSelection(item(), ["single", "cheese", "egg", "jalapeno"])).toEqual([
      { groupId: "g-extras", kind: "max", limit: 2 },
    ]);
    expect(validateSelection(item(), ["double", "cheese"])).toEqual([]);
  });

  it("radio groups swap; required radios can't be cleared", () => {
    expect(toggleOption(patty, ["single", "cheese"], "double")).toEqual(["cheese", "double"]);
    expect(toggleOption(patty, ["single"], "single")).toEqual(["single"]);
  });

  it("checkbox groups stop at max", () => {
    let s = toggleOption(extras, ["single"], "cheese");
    s = toggleOption(extras, s, "egg");
    expect(toggleOption(extras, s, "jalapeno")).toEqual(s);
    expect(toggleOption(extras, s, "cheese")).toEqual(["single", "egg"]);
  });

  it("previews the unit price with modifier deltas (integer poisha)", () => {
    expect(unitPricePreview(item(), ["double", "cheese"])).toBe(66000);
  });

  it("labels modifiers in the current language", () => {
    expect(modifierLabels(item(), ["double", "cheese", "egg"], "bn")).toEqual([
      "ডাবল",
      "চেডার চিজ",
      "Fried egg",
    ]);
  });
});

describe("search & filters", () => {
  const items = [
    item(),
    item({
      id: "firni",
      name: "Firni",
      name_bn: "ফিরনি",
      description: "Cardamom rice pudding",
      tags: ["veg"],
      spice_level: 0,
      sort: 2,
      groups: [],
    }),
    item({
      id: "kacchi",
      name: "Mutton Kacchi Biryani",
      name_bn: "মাটন কাচ্চি বিরিয়ানি",
      description: "Dum-cooked basmati",
      spice_level: 2,
      sort: 3,
      groups: [],
    }),
  ];

  it("matches names in both languages and descriptions", () => {
    expect(searchItems(items, "kacchi").map((i) => i.id)).toEqual(["kacchi"]);
    expect(searchItems(items, "ফিরনি").map((i) => i.id)).toEqual(["firni"]);
    expect(searchItems(items, "cardamom").map((i) => i.id)).toEqual(["firni"]);
  });

  it("tolerates small typos", () => {
    expect(searchItems(items, "biryni").map((i) => i.id)).toEqual(["kacchi"]);
  });

  it("returns everything for an empty query and nothing for nonsense", () => {
    expect(searchItems(items, "  ")).toHaveLength(3);
    expect(searchItems(items, "zzzz")).toEqual([]);
  });

  it("filters veg and spice level", () => {
    expect(applyFilters(items, { vegOnly: true, maxSpice: null }).map((i) => i.id)).toEqual([
      "firni",
    ]);
    expect(applyFilters(items, { vegOnly: false, maxSpice: 1 }).map((i) => i.id)).toEqual([
      "burger",
      "firni",
    ]);
  });
});
