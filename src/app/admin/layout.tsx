import type { Metadata } from "next";

import { SurfaceTheme } from "@/components/providers/surface-theme";
import { AdminProvider } from "@/features/admin/admin-context";
import { AdminShell } from "@/features/admin/admin-shell";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Owners and managers only (spec §2). Every action re-checks on the server and in RLS. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin");
  if (!access.ok) return <NoAccess access={access} />;
  const { staff } = access;
  return (
    <SurfaceTheme surface="staff">
      <AdminProvider
        user={{
          userId: staff.userId,
          role: staff.role,
          displayName: staff.displayName,
          avatarColor: staff.avatarColor,
          restaurantId: staff.restaurantId,
          restaurantName: staff.restaurantName,
        }}
      >
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </SurfaceTheme>
  );
}
