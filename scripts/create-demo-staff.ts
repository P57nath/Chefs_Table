/**
 * Creates (or repairs) the demo staff accounts. Idempotent: safe to run many times.
 *
 *   pnpm seed:staff                      # all demo accounts, local Supabase only
 *   pnpm seed:staff --only owner --allow-remote   # first owner in production
 *
 * Existing users keep their password; their `staff_members` row is upserted.
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";
import {
  DEMO_STAFF,
  demoStaffEnvSchema,
  isLocalUrl,
  parseCliArgs,
  planDemoStaff,
  selectStaff,
  staffMemberRow,
} from "./demo-staff";

async function listAllUsers(admin: SupabaseClient<Database>): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const parsed = demoStaffEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment for seed:staff:\n${issues.join("\n")}`);
  }
  const env = parsed.data;

  if (!isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL) && !opts.allowRemote) {
    throw new Error(
      `Refusing to seed staff on non-local Supabase (${env.NEXT_PUBLIC_SUPABASE_URL}). ` +
        "Pass --allow-remote (and usually --only owner) if you really mean it.",
    );
  }

  const admin = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("id", env.DEMO_RESTAURANT_ID)
    .maybeSingle();
  if (restaurantError) throw new Error(`Restaurant lookup failed: ${restaurantError.message}`);
  if (!restaurant) {
    throw new Error(
      `Restaurant ${env.DEMO_RESTAURANT_ID} not found — run \`pnpm db:reset\` first.`,
    );
  }

  const plan = planDemoStaff(selectStaff(DEMO_STAFF, opts.only), await listAllUsers(admin));

  for (const { member, existingUserId } of plan) {
    let userId = existingUserId;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: member.email,
        password: env.DEMO_STAFF_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: member.displayName },
      });
      if (error || !data.user) {
        throw new Error(`createUser ${member.email} failed: ${error?.message ?? "no user"}`);
      }
      userId = data.user.id;
    }

    const { error } = await admin
      .from("staff_members")
      .upsert(staffMemberRow(member, userId, env.DEMO_RESTAURANT_ID), { onConflict: "user_id" });
    if (error) throw new Error(`staff_members upsert ${member.email} failed: ${error.message}`);

    console.log(
      `${existingUserId ? "✓ exists " : "+ created"}  ${member.role.padEnd(8)} ${member.email}`,
    );
  }
  console.log(`Done — ${plan.length} staff account(s) ready for "${restaurant.name}".`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
