"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { MENU_TAG } from "@/features/guest/server/table-data";

import { categorySchema, itemSchema, type CategoryInput, type ItemInput } from "../schemas";
import { failure, requireManager, type ActionResult } from "./guard";

/** Every menu change refreshes the guest menu cache (tag `menu`) and the editor. */
function refresh() {
  revalidateTag(MENU_TAG, "max");
  revalidatePath("/admin/menu");
}

const id = z.uuid();
const ids = z.array(z.uuid()).max(500);

export async function saveCategory(raw: CategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    const input = categorySchema.parse(raw);
    const { staff, supabase } = await requireManager();
    const row = { name: input.name, name_bn: input.nameBn, icon: input.icon };
    if (input.id) {
      const { data, error } = await supabase
        .from("menu_categories")
        .update(row)
        .eq("id", input.id)
        .select("id");
      if (error) throw error;
      if (!data.length) return { ok: false, error: "NOT_FOUND" };
      refresh();
      return { ok: true, data: { id: input.id } };
    }
    const { data: last } = await supabase
      .from("menu_categories")
      .select("sort")
      .eq("restaurant_id", staff.restaurantId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ ...row, restaurant_id: staff.restaurantId, sort: (last?.sort ?? 0) + 1 })
      .select("id")
      .single();
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return failure(err);
  }
}

/** Archive / restore (soft delete — order history keeps its snapshots). */
export async function setCategoryActive(
  categoryId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { data, error } = await supabase
      .from("menu_categories")
      .update({ is_active: z.boolean().parse(active) })
      .eq("id", id.parse(categoryId))
      .select("id");
    if (error) throw error;
    if (!data.length) return { ok: false, error: "NOT_FOUND" };
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function saveItem(raw: ItemInput): Promise<ActionResult<{ id: string }>> {
  try {
    const input = itemSchema.parse(raw);
    const { supabase } = await requireManager();
    const { data, error } = await supabase.rpc("admin_save_menu_item", {
      p: {
        id: input.id ?? null,
        category_id: input.categoryId,
        name: input.name,
        name_bn: input.nameBn,
        description: input.description,
        description_bn: input.descriptionBn,
        price_minor: input.price,
        image_path: input.imagePath,
        tags: input.tags,
        spice_level: input.spiceLevel,
        prep_minutes: input.prepMinutes,
        is_available: input.isAvailable,
        groups: input.groups.map((g) => ({
          id: g.id ?? null,
          name: g.name,
          name_bn: g.nameBn,
          min_select: g.minSelect,
          max_select: g.maxSelect,
          options: g.options.map((o) => ({
            id: o.id ?? null,
            name: o.name,
            name_bn: o.nameBn,
            price_delta_minor: o.priceDelta,
            is_default: o.isDefault,
            is_available: o.isAvailable,
          })),
        })),
      },
    });
    if (error) {
      if (error.message.includes("NOT_FOUND")) return { ok: false, error: "NOT_FOUND" };
      throw error;
    }
    refresh();
    return { ok: true, data: { id: data } };
  } catch (err) {
    return failure(err);
  }
}

export async function duplicateItem(itemId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireManager();
    const { data, error } = await supabase.rpc("admin_duplicate_menu_item", {
      p_item_id: id.parse(itemId),
    });
    if (error) throw error;
    refresh();
    return { ok: true, data: { id: data } };
  } catch (err) {
    return failure(err);
  }
}

export async function setItemActive(itemId: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { data, error } = await supabase
      .from("menu_items")
      .update({ is_active: z.boolean().parse(active) })
      .eq("id", id.parse(itemId))
      .select("id");
    if (error) throw error;
    if (!data.length) return { ok: false, error: "NOT_FOUND" };
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** Sold-out toggle from the editor (same RPC the floor uses). */
export async function setItemAvailable(itemId: string, available: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc("set_item_availability", {
      p_item_id: id.parse(itemId),
      p_available: z.boolean().parse(available),
    });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function reorder(
  kind: "categories" | "items" | "zones",
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc("admin_reorder", {
      p_kind: z.enum(["categories", "items", "zones"]).parse(kind),
      p_ids: ids.parse(orderedIds),
    });
    if (error) throw error;
    if (kind === "zones") revalidatePath("/admin/floor");
    else refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
