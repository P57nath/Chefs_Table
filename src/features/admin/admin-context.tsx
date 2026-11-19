"use client";

import { createContext, use, type ReactNode } from "react";

import type { StaffRole } from "@/features/auth/roles";

export interface AdminUser {
  userId: string;
  role: StaffRole;
  displayName: string;
  avatarColor: string;
  restaurantId: string;
  restaurantName: string;
}

const AdminContext = createContext<AdminUser | null>(null);

export function AdminProvider({ user, children }: { user: AdminUser; children: ReactNode }) {
  return <AdminContext value={user}>{children}</AdminContext>;
}

export function useAdmin(): AdminUser {
  const v = use(AdminContext);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}
