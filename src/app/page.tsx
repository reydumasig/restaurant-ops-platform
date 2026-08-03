import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { branches, roles, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
            <Card className="mb-6">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">
                    Signed in as <span className="font-medium">{appUser.fullName}</span> ({appUser.roleName}) —{" "}
                    {appUser.branchName ?? "All branches (HQ)"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="link" size="sm">
                    <Link href="/master-data/branches">Master Data</Link>
                  </Button>
                  <Button asChild variant="link" size="sm">
                    <Link href="/inventory">Inventory</Link>
                  </Button>
                  <Button asChild variant="link" size="sm">
                    <Link href="/transfers">Transfers</Link>
                  </Button>
                  <Button asChild variant="link" size="sm">
                    <Link href="/production">Production</Link>
                  </Button>
                  <Button asChild variant="link" size="sm">
                    <Link href="/pos">POS</Link>
                  </Button>
                  <Button asChild variant="link" size="sm">
                    <Link href="/reports/inventory">Reports</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
