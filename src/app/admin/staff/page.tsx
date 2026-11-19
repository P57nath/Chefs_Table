import { getTranslations } from "next-intl/server";

import { AdminPageHeader } from "@/features/admin/page-header";
import { StaffManager, type StaffRow } from "@/features/admin/staff/staff-manager";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

/** Team list with roles, active state and sign-in emails (spec §7). */
export default async function AdminStaffPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/staff");
  if (!access.ok) return null;
  const t = await getTranslations("admin.staff");
  // RLS lets owners/managers read their own team; emails live in auth (secret key, server only).
  const { data, error } = await (
    await getServerSupabase()
  )
    .from("staff_members")
    .select("user_id, role, display_name, avatar_color, is_active, created_at")
    .eq("restaurant_id", access.staff.restaurantId)
    .order("created_at");
  if (error) throw error;
  const admin = getAdminSupabase();
  const rows: StaffRow[] = await Promise.all(
    data.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      return {
        userId: m.user_id,
        role: m.role,
        displayName: m.display_name,
        avatarColor: m.avatar_color,
        isActive: m.is_active,
        email: u.user?.email ?? "",
        lastSignIn: u.user?.last_sign_in_at ?? null,
      };
    }),
  );

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <StaffManager rows={rows} actorRole={access.staff.role} actorId={access.staff.userId} />
    </>
  );
}
