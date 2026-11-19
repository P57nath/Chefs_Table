import type { Metadata } from "next";

import { ALL_STAFF_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { SoldOutList } from "@/features/staff/menu/sold-out-list";
import { NoAccess } from "@/features/staff/no-access";

export const metadata: Metadata = { title: "Sold out" };

/** Every staff role may 86 an item (spec §2). */
export default async function StaffMenuPage() {
  const access = await requireStaff(ALL_STAFF_ROLES, "/staff/menu");
  if (!access.ok) return <NoAccess access={access} />;
  return <SoldOutList />;
}
