import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getServerSupabase } from "@/lib/supabase/server";

import { canUse, type StaffRole } from "./roles";

export interface StaffUser {
  userId: string;
  email: string | null;
  role: StaffRole;
  displayName: string;
  avatarColor: string;
  restaurantId: string;
  restaurantName: string;
  isActive: boolean;
}

/** The signed-in staff member (validated with the auth server), or null. Deduped per request. */
export const getCurrentStaff = cache(async (): Promise<StaffUser | null | "not-staff"> => {
  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user || user.is_anonymous) return null;

  const { data, error } = await supabase
    .from("staff_members")
    .select("role, display_name, avatar_color, restaurant_id, is_active, restaurants ( name )")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return "not-staff";

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data.role,
    displayName: data.display_name,
    avatarColor: data.avatar_color,
    restaurantId: data.restaurant_id,
    restaurantName: data.restaurants?.name ?? "",
    isActive: data.is_active,
  };
});

export type StaffAccess =
  | { ok: true; staff: StaffUser }
  | { ok: false; reason: "not-staff" | "inactive" | "role"; staff: StaffUser | null };

/**
 * Server-side gate for staff screens. Redirects signed-out users to /login;
 * returns a reason (rendered as a friendly screen) when the role is wrong.
 */
export async function requireStaff(
  allowed: readonly StaffRole[],
  currentPath: string,
): Promise<StaffAccess> {
  const staff = await getCurrentStaff();
  if (staff === null) redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  if (staff === "not-staff") return { ok: false, reason: "not-staff", staff: null };
  if (!staff.isActive) return { ok: false, reason: "inactive", staff };
  if (!canUse(staff.role, allowed)) return { ok: false, reason: "role", staff };
  return { ok: true, staff };
}
