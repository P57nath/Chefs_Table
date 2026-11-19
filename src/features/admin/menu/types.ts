import { toDecimalString } from "@/lib/money";

import type { ItemInput } from "../schemas";

export interface AdminCategory {
  id: string;
  name: string;
  name_bn: string | null;
  icon: string | null;
  sort: number;
  is_active: boolean;
}

export interface AdminOption {
  id: string;
  name: string;
  name_bn: string | null;
  price_delta_minor: number;
  is_default: boolean;
  is_available: boolean;
  sort: number;
}

export interface AdminGroup {
  id: string;
  name: string;
  name_bn: string | null;
  min_select: number;
  max_select: number;
  sort: number;
  modifier_options: AdminOption[];
}

export interface AdminItem {
  id: string;
  category_id: string;
  name: string;
  name_bn: string | null;
  description: string | null;
  description_bn: string | null;
  price_minor: number;
  image_path: string | null;
  tags: string[];
  spice_level: number;
  prep_minutes: number;
  is_available: boolean;
  is_active: boolean;
  sort: number;
  modifier_groups: AdminGroup[];
}

export const ADMIN_ITEM_COLUMNS = `
  id, category_id, name, name_bn, description, description_bn, price_minor, image_path, tags,
  spice_level, prep_minutes, is_available, is_active, sort,
  modifier_groups ( id, name, name_bn, min_select, max_select, sort,
    modifier_options ( id, name, name_bn, price_delta_minor, is_default, is_available, sort ) )
`;

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

/** DB row → editable form state (money as text, never floats). */
export function toItemForm(item: AdminItem): ItemInput {
  return {
    id: item.id,
    categoryId: item.category_id,
    name: item.name,
    nameBn: item.name_bn ?? "",
    description: item.description ?? "",
    descriptionBn: item.description_bn ?? "",
    price: toDecimalString(item.price_minor),
    imagePath: item.image_path,
    tags: item.tags.filter((t): t is ItemInput["tags"][number] =>
      ["veg", "chef_special", "new", "bestseller"].includes(t),
    ),
    spiceLevel: item.spice_level,
    prepMinutes: item.prep_minutes,
    isAvailable: item.is_available,
    groups: [...item.modifier_groups].sort(bySort).map((g) => ({
      id: g.id,
      name: g.name,
      nameBn: g.name_bn ?? "",
      minSelect: g.min_select,
      maxSelect: g.max_select,
      options: [...g.modifier_options].sort(bySort).map((o) => ({
        id: o.id,
        name: o.name,
        nameBn: o.name_bn ?? "",
        priceDelta: toDecimalString(o.price_delta_minor),
        isDefault: o.is_default,
        isAvailable: o.is_available,
      })),
    })),
  };
}

export function emptyItemForm(categoryId: string): ItemInput {
  return {
    categoryId,
    name: "",
    nameBn: "",
    description: "",
    descriptionBn: "",
    price: "",
    imagePath: null,
    tags: [],
    spiceLevel: 0,
    prepMinutes: 15,
    isAvailable: true,
    groups: [],
  };
}
