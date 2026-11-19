import type { Metadata } from "next";

import { SurfaceTheme } from "@/components/providers/surface-theme";
import { KITCHEN_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";
import { StaffProvider } from "@/features/staff/staff-context";

export const metadata: Metadata = {
  title: "Kitchen",
  robots: { index: false, follow: false },
};

/** Kitchen display: kitchen, manager, owner only. Always dark. */
export default async function KitchenLayout({ children }: LayoutProps<"/kitchen">) {
  const access = await requireStaff(KITCHEN_ROLES, "/kitchen");
  if (!access.ok) return <NoAccess access={access} />;
  const { staff } = access;
  return (
    <SurfaceTheme surface="kitchen">
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
