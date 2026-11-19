import { z } from "zod";

/** Staff roles, mirroring `public.staff_role` in the database. */
export type StaffRole = "owner" | "manager" | "waiter" | "kitchen" | "cashier";

export interface DemoStaffMember {
  email: string;
  role: StaffRole;
  displayName: string;
  avatarColor: string;
}

/** Demo accounts from docs/05-BUILD-PLAN.md (Phase 1). */
export const DEMO_STAFF: readonly DemoStaffMember[] = [
  {
    email: "owner@demo.local",
    role: "owner",
    displayName: "Farhana Rahman",
    avatarColor: "#F5A524",
  },
  {
    email: "manager@demo.local",
    role: "manager",
    displayName: "Tanvir Ahmed",
    avatarColor: "#A78BFA",
  },
  { email: "waiter@demo.local", role: "waiter", displayName: "Rafi Hasan", avatarColor: "#2DD4BF" },
  {
    email: "waiter2@demo.local",
    role: "waiter",
    displayName: "Mitu Akter",
    avatarColor: "#5AA9F0",
  },
  {
    email: "kitchen@demo.local",
    role: "kitchen",
    displayName: "Jamal Uddin",
    avatarColor: "#FB923C",
  },
  {
    email: "cashier@demo.local",
    role: "cashier",
    displayName: "Sadia Islam",
    avatarColor: "#3FB37F",
  },
];

export const demoStaffEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  DEMO_RESTAURANT_ID: z.uuid(),
  DEMO_STAFF_PASSWORD: z
    .string()
    .min(8, "DEMO_STAFF_PASSWORD must be at least 8 characters")
    .regex(/[A-Za-z]/, "DEMO_STAFF_PASSWORD must contain a letter")
    .regex(/\d/, "DEMO_STAFF_PASSWORD must contain a digit"),
});
export type DemoStaffEnv = z.infer<typeof demoStaffEnvSchema>;

export interface CliOptions {
  /** Only create these roles (e.g. `--only owner` for a first production owner). */
  only: StaffRole[] | null;
  /** Required to run against a non-local Supabase URL. */
  allowRemote: boolean;
}

const ROLES: readonly StaffRole[] = ["owner", "manager", "waiter", "kitchen", "cashier"];

export function parseCliArgs(argv: readonly string[]): CliOptions {
  const opts: CliOptions = { only: null, allowRemote: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--allow-remote") opts.allowRemote = true;
    else if (arg === "--only") {
      const value = argv[++i];
      if (!value) throw new Error("--only needs a comma-separated list of roles");
      const roles = value.split(",").map((r) => r.trim());
      for (const r of roles) {
        if (!ROLES.includes(r as StaffRole)) throw new Error(`Unknown role in --only: ${r}`);
      }
      opts.only = roles as StaffRole[];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

export function isLocalUrl(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function selectStaff(staff: readonly DemoStaffMember[], only: StaffRole[] | null) {
  return only ? staff.filter((s) => only.includes(s.role)) : [...staff];
}

export interface StaffPlanStep {
  member: DemoStaffMember;
  /** Existing auth user id, or null when the user must be created. */
  existingUserId: string | null;
}

/** Pure planning step: which accounts exist already (matched case-insensitively by email). */
export function planDemoStaff(
  staff: readonly DemoStaffMember[],
  existingUsers: ReadonlyArray<{ id: string; email?: string | null }>,
): StaffPlanStep[] {
  const byEmail = new Map(
    existingUsers.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u.id]),
  );
  return staff.map((member) => ({
    member,
    existingUserId: byEmail.get(member.email.toLowerCase()) ?? null,
  }));
}

export function staffMemberRow(member: DemoStaffMember, userId: string, restaurantId: string) {
  return {
    user_id: userId,
    restaurant_id: restaurantId,
    role: member.role,
    display_name: member.displayName,
    avatar_color: member.avatarColor,
    is_active: true,
  };
}
