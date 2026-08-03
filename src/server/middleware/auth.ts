import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "@/db/client";
import { roles, users } from "@/db/schema";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import type { AuthUser, RoleKey } from "@/server/lib/rbac";

export type AuthVariables = { authUser: AuthUser };

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const supabase = createSupabaseServerClient(c);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      roleId: users.roleId,
      roleKey: roles.key,
      branchId: users.branchId,
      active: users.active,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row || !row.active) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("authUser", {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    roleId: row.roleId,
    roleKey: row.roleKey as RoleKey,
    branchId: row.branchId,
  });

  await next();
});

export function requireRole(...allowed: RoleKey[]) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const authUser = c.get("authUser");
    if (!allowed.includes(authUser.roleKey)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  });
}
