import type { StaffRole } from "@/features/auth/roles";

/**
 * Who may manage whom (spec §2: managers handle staff accounts, but not
 * owners). Pure so it is unit-tested; the server action enforces it.
 */
export function canManageStaff(
  actor: StaffRole,
  target: StaffRole | null,
  nextRole?: StaffRole,
): boolean {
  if (actor === "owner") return true;
  if (actor !== "manager") return false;
  return target !== "owner" && nextRole !== "owner";
}

/** Roles the actor may assign in the UI. */
export function assignableRoles(actor: StaffRole): StaffRole[] {
  const all: StaffRole[] = ["owner", "manager", "waiter", "cashier", "kitchen"];
  return all.filter((r) => canManageStaff(actor, null, r));
}

/** Changing this member would leave the restaurant without an active owner. */
export function removesLastOwner(
  members: { userId: string; role: StaffRole; isActive: boolean }[],
  targetId: string,
  change: { role?: StaffRole; isActive?: boolean },
): boolean {
  const after = members.map((m) =>
    m.userId === targetId
      ? { ...m, role: change.role ?? m.role, isActive: change.isActive ?? m.isActive }
      : m,
  );
  const before = members.some((m) => m.role === "owner" && m.isActive);
  return before && !after.some((m) => m.role === "owner" && m.isActive);
}

/** Readable temporary password that meets the auth policy (letters + digits, 12 chars). */
export function temporaryPassword(
  random: (n: number) => number = (n) => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % n,
): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (s: string) => s[random(s.length)] ?? "a";
  const chars = Array.from({ length: 9 }, () => pick(letters));
  chars.push(pick(digits), pick(digits), pick(digits));
  return chars.join("");
}
