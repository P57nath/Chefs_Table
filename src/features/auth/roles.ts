import type { Database } from "@/types/database";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

/** Who can do what (docs/01-PRODUCT-SPEC.md §2). The database enforces the same rules. */
export const FLOOR_ROLES: readonly StaffRole[] = ["waiter", "cashier", "manager", "owner"];
export const KITCHEN_ROLES: readonly StaffRole[] = ["kitchen", "manager", "owner"];
export const MANAGEMENT_ROLES: readonly StaffRole[] = ["manager", "owner"];
export const ALL_STAFF_ROLES: readonly StaffRole[] = [
  "waiter",
  "cashier",
  "kitchen",
  "manager",
  "owner",
];

export const PROTECTED_PREFIXES = ["/staff", "/kitchen", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only same-origin, absolute paths are allowed as post-login redirects
 * (prevents open redirects like `//evil.com` or `https://…`).
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return null;
  if (/[\r\n]/.test(next)) return null;
  return isProtectedPath(next.split(/[?#]/)[0] ?? "") ? next : null;
}

/** Where each role lands after signing in. */
export function homeFor(role: StaffRole): string {
  return role === "kitchen" ? "/kitchen" : "/staff";
}

export function canUse(role: StaffRole, allowed: readonly StaffRole[]): boolean {
  return allowed.includes(role);
}
