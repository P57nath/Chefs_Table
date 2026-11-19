"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";

import { newStaffSchema, STAFF_ROLES, type NewStaffInput } from "../schemas";
import { canManageStaff, removesLastOwner } from "../staff/permissions";
import { ActionError, failure, requireManager, type ActionResult } from "./guard";

/**
 * Staff accounts (spec §7). staff_members has no client write policy:
 * these actions re-check the caller (owner/manager, same restaurant,
 * owner-only rules) and then write with the server-only secret key.
 */

const AVATAR_COLORS = ["#F59E0B", "#E5533D", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];
const BANNED = "876000h"; // ~100 years: blocks sign-in and token refresh

async function team(restaurantId: string) {
  const { data, error } = await getAdminSupabase()
    .from("staff_members")
    .select("user_id, role, is_active")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return data.map((m) => ({ userId: m.user_id, role: m.role, isActive: m.is_active }));
}

export async function createStaff(raw: NewStaffInput): Promise<ActionResult> {
  try {
    const input = newStaffSchema.parse(raw);
    const { staff } = await requireManager();
    if (!canManageStaff(staff.role, null, input.role)) throw new ActionError("OWNER_ONLY");

    const admin = getAdminSupabase();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password: input.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "email_exists" || /already/i.test(error?.message ?? "")) {
        throw new ActionError("EMAIL_TAKEN");
      }
      if (code === "weak_password") throw new ActionError("INVALID_INPUT");
      throw error ?? new Error("createUser failed");
    }
    const { error: insErr } = await admin.from("staff_members").insert({
      user_id: created.user.id,
      restaurant_id: staff.restaurantId,
      role: input.role,
      display_name: input.displayName,
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? "#F59E0B",
    });
    if (insErr) {
      await admin.auth.admin.deleteUser(created.user.id); // don't leave a login without a staff row
      throw insErr;
    }
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

const updateSchema = z.object({
  userId: z.uuid(),
  role: z.enum(STAFF_ROLES).optional(),
  displayName: z.string().trim().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

export async function updateStaff(raw: z.input<typeof updateSchema>): Promise<ActionResult> {
  try {
    const input = updateSchema.parse(raw);
    const { staff } = await requireManager();
    const members = await team(staff.restaurantId);
    const target = members.find((m) => m.userId === input.userId);
    if (!target) throw new ActionError("NOT_FOUND");
    if (!canManageStaff(staff.role, target.role, input.role)) throw new ActionError("OWNER_ONLY");
    if (
      input.userId === staff.userId &&
      (input.isActive === false || (input.role && input.role !== staff.role))
    ) {
      throw new ActionError("SELF");
    }
    if (removesLastOwner(members, input.userId, input)) throw new ActionError("LAST_OWNER");

    const admin = getAdminSupabase();
    const { error } = await admin
      .from("staff_members")
      .update({
        ...(input.role ? { role: input.role } : {}),
        ...(input.displayName ? { display_name: input.displayName } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
      })
      .eq("user_id", input.userId)
      .eq("restaurant_id", staff.restaurantId);
    if (error) throw error;
    if (input.isActive !== undefined) {
      const { error: banErr } = await admin.auth.admin.updateUserById(input.userId, {
        ban_duration: input.isActive ? "none" : BANNED,
      });
      if (banErr) throw banErr;
    }
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

const passwordSchema = z.object({ userId: z.uuid(), password: newStaffSchema.shape.password });

export async function resetStaffPassword(
  raw: z.input<typeof passwordSchema>,
): Promise<ActionResult> {
  try {
    const input = passwordSchema.parse(raw);
    const { staff } = await requireManager();
    const target = (await team(staff.restaurantId)).find((m) => m.userId === input.userId);
    if (!target) throw new ActionError("NOT_FOUND");
    if (!canManageStaff(staff.role, target.role)) throw new ActionError("OWNER_ONLY");
    const { error } = await getAdminSupabase().auth.admin.updateUserById(input.userId, {
      password: input.password,
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
