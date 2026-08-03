import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { branches, roles, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return null;
  }

  const [appUser] = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      roleName: roles.name,
      branchName: branches.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(branches, eq(users.branchId, branches.id))
    .where(eq(users.id, data.user.id))
    .limit(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Restaurant Ops Platform</h1>
        <SignOutButton />
      </header>
      <main className="p-6">
        {appUser ? (
          <>
            <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <p className="text-sm text-gray-900">
                  Signed in as <span className="font-medium">{appUser.fullName}</span> ({appUser.roleName}) —{" "}
                  {appUser.branchName ?? "All branches (HQ)"}
                </p>
              </div>
              <div className="flex gap-4">
                <Link href="/master-data/branches" className="text-sm text-blue-600 hover:underline">
                  Master Data
                </Link>
                <Link href="/inventory" className="text-sm text-blue-600 hover:underline">
                  Inventory
                </Link>
                <Link href="/transfers" className="text-sm text-blue-600 hover:underline">
                  Transfers
                </Link>
                <Link href="/production" className="text-sm text-blue-600 hover:underline">
                  Production
                </Link>
                <Link href="/pos" className="text-sm text-blue-600 hover:underline">
                  POS
                </Link>
                <Link href="/reports/inventory" className="text-sm text-blue-600 hover:underline">
                  Reports
                </Link>
              </div>
            </div>
            <Dashboard />
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Your Supabase Auth account exists, but no matching row was found in <code>public.users</code>. An
            owner/admin needs to provision your account.
          </div>
        )}
      </main>
    </div>
  );
}
