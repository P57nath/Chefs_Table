import type { Metadata } from "next";

import { ServiceWorkerRegister } from "@/components/providers/service-worker";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { ALL_STAFF_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";
import { StaffProvider } from "@/features/staff/staff-context";
import { StaffShell } from "@/features/staff/staff-shell";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
  manifest: "/staff.webmanifest",
  appleWebApp: { capable: true, title: "Floor", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

/** Any active staff member gets the shell; each page checks its own roles. */
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const access = await requireStaff(ALL_STAFF_ROLES, "/staff");
  if (!access.ok) return <NoAccess access={access} />;
  const { staff } = access;

  return (
    <SurfaceTheme surface="staff">
      <ServiceWorkerRegister />
      <StaffProvider
        staff={{
          userId: staff.userId,
          role: staff.role,
          displayName: staff.displayName,
          avatarColor: staff.avatarColor,
          restaurantId: staff.restaurantId,
          restaurantName: staff.restaurantName,
        }}
      >
        <StaffShell>{children}</StaffShell>
      </StaffProvider>
    </SurfaceTheme>
  );
}
