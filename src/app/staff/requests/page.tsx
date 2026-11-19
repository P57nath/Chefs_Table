import type { Metadata } from "next";

import { FLOOR_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";
import { RequestsList } from "@/features/staff/requests/requests-list";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage() {
  const access = await requireStaff(FLOOR_ROLES, "/staff/requests");
  if (!access.ok) return <NoAccess access={access} />;
  return <RequestsList />;
}
