import { redirect } from "next/navigation";

import { requireStaff } from "@/features/auth/staff-server";
import { ALL_STAFF_ROLES } from "@/features/auth/roles";

/**
 * Staff home. The live floor (3D / 2D / list) lands here in Phase 6; until then
 * floor roles start on the orders board; kitchen staff go to the kitchen display.
 */
export default async function StaffHome() {
  const access = await requireStaff(ALL_STAFF_ROLES, "/staff");
  redirect(access.ok && access.staff.role === "kitchen" ? "/kitchen" : "/staff/orders");
}
