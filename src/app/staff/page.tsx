import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ALL_STAFF_ROLES, canUse, FLOOR_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { FloorScreen } from "@/features/floor/floor-screen";
import { NoAccess } from "@/features/staff/no-access";

export const metadata: Metadata = { title: "Floor" };

/** Staff home: the live floor. Kitchen staff go to the kitchen display. */
export default async function StaffHome() {
  const access = await requireStaff(ALL_STAFF_ROLES, "/staff");
  if (!access.ok) return <NoAccess access={access} />;
  if (!canUse(access.staff.role, FLOOR_ROLES)) redirect("/kitchen");
  return <FloorScreen />;
}
