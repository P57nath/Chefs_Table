"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { layoutSchema, tableSchema, zoneSchema, type TableInput } from "../schemas";
import { failure, requireManager, type ActionResult } from "./guard";

const id = z.uuid();

function refresh() {
  revalidatePath("/admin/floor");
  revalidatePath("/admin/qr");
  revalidatePath("/staff");
}

export async function saveZone(raw: { id?: string; name: string }): Promise<ActionResult> {
  try {
    const input = zoneSchema.parse(raw);
    const { staff, supabase } = await requireManager();
    if (input.id) {
      const { data, error } = await supabase
        .from("zones")
        .update({ name: input.name })
        .eq("id", input.id)
        .select("id");
      if (error) throw error;
      if (!data.length) return { ok: false, error: "NOT_FOUND" };
    } else {
      const { count } = await supabase
        .from("zones")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", staff.restaurantId);
      const { error } = await supabase
        .from("zones")
        .insert({ restaurant_id: staff.restaurantId, name: input.name, sort: (count ?? 0) + 1 });
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** Tables in the zone keep their place and simply have no zone afterwards. */
export async function deleteZone(zoneId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { data, error } = await supabase
      .from("zones")
      .delete()
      .eq("id", id.parse(zoneId))
      .select("id");
    if (error) throw error;
    if (!data.length) return { ok: false, error: "NOT_FOUND" };
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function saveTable(raw: TableInput): Promise<ActionResult> {
  try {
    const input = tableSchema.parse(raw);
    const { staff, supabase } = await requireManager();
    const row = {
      label: input.label,
      seats: input.seats,
      shape: input.shape,
      zone_id: input.zoneId,
    };
    if (input.id) {
      const { data, error } = await supabase
        .from("dining_tables")
        .update(row)
        .eq("id", input.id)
        .select("id");
      if (error) throw error;
      if (!data.length) return { ok: false, error: "NOT_FOUND" };
    } else {
      // New tables start in the top-left corner of the plan; drag them into place.
      const { error } = await supabase
        .from("dining_tables")
        .insert({ ...row, restaurant_id: staff.restaurantId, pos_x: 1, pos_y: 1 });
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** Deactivate instead of delete: past sessions and orders reference the table. */
export async function setTableActive(tableId: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { data, error } = await supabase
      .from("dining_tables")
      .update({ is_active: z.boolean().parse(active) })
      .eq("id", id.parse(tableId))
      .select("id");
    if (error) throw error;
    if (!data.length) return { ok: false, error: "NOT_FOUND" };
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function saveLayout(
  raw: { id: string; x: number; y: number; rotation: number }[],
): Promise<ActionResult> {
  try {
    const layout = layoutSchema.parse(raw);
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc("admin_save_floor_layout", { p: layout });
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/** New QR token: printed codes for this table stop working immediately. */
export async function rotateQr(tableId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireManager();
    const { error } = await supabase.rpc("admin_rotate_qr", { p_table_id: id.parse(tableId) });
    if (error) {
      if (error.message.includes("NOT_FOUND")) return { ok: false, error: "NOT_FOUND" };
      throw error;
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
