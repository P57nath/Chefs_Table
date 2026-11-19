import type { Metadata } from "next";

import { FLOOR_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { NoAccess } from "@/features/staff/no-access";
import { OrdersBoard } from "@/features/staff/orders/orders-board";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const access = await requireStaff(FLOOR_ROLES, "/staff/orders");
  if (!access.ok) return <NoAccess access={access} />;
  return <OrdersBoard />;
}
