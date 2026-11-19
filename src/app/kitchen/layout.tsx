import type { Metadata } from "next";

import { ServiceWorkerRegister } from "@/components/providers/service-worker";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { KITCHEN_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";
import { StaffProvider } from "@/features/staff/staff-context";

export const metadata: Metadata = {
  title: "Kitchen",
  robots: { index: false, follow: false },
  manifest: "/kitchen.webmanifest",
  appleWebApp: { capable: true, title: "Kitchen", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

/** Kitchen display: kitchen, manager, owner only. Always dark. */
export default async function KitchenLayout({ children }: LayoutProps<"/kitchen">) {
  const access = await requireStaff(KITCHEN_ROLES, "/kitchen");
  if (!access.ok) return <NoAccess access={access} />;
  const { staff } = access;
  return (
    <SurfaceTheme surface="kitchen">
      <ServiceWorkerRegister />
      <StaffProvider
        surface="kitchen"
        staff={{
          userId: staff.userId,
          role: staff.role,
          displayName: staff.displayName,
          avatarColor: staff.avatarColor,
          restaurantId: staff.restaurantId,
          restaurantName: staff.restaurantName,
        }}
      >
        {children}
      </StaffProvider>
    </SurfaceTheme>
  );
}
