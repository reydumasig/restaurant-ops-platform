/**
 * Bootstraps the first Owner account for local development, since the
 * Master Data "Users" screen requires an existing Owner/Admin to create
 * further users. Not part of the app itself — dev-only utility.
 *
 * Usage: npm run seed:owner -- owner@example.com somepassword "Owner Name"
 */
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { roles, users } from "../src/db/schema";

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password || !fullName) {
    console.error('Usage: npm run seed:owner -- owner@example.com somepassword "Owner Name"');
    process.exit(1);
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("Failed to create auth user:", error?.message);
    process.exit(1);
  }

  const [ownerRole] = await db.select().from(roles).where(eq(roles.key, "owner")).limit(1);
  if (!ownerRole) {
    console.error("Owner role not found — did migrations/seed run?");
    process.exit(1);
  }

  await db.insert(users).values({
    id: data.user.id,
    fullName,
    email,
    roleId: ownerRole.id,
    branchId: null,
  });

  console.log(`Owner account created: ${email}`);
  process.exit(0);
}

main();
