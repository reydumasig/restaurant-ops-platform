import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branches, roles, users } from "@/db/schema";
import { requireRole } from "@/server/middleware/auth";
import { recordAudit } from "@/server/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthVariables } from "@/server/middleware/auth";

export const usersRoute = new Hono<{ Variables: AuthVariables }>();

const createUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  roleId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
});

const updateUserInput = z.object({
  fullName: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional().nullable(),
});

usersRoute.get("/", requireRole("owner", "admin"), async (c) => {
  const rows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      active: users.active,
      roleId: users.roleId,
      roleName: roles.name,
      roleKey: roles.key,
      branchId: users.branchId,
      branchName: branches.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(branches, eq(users.branchId, branches.id))
    .orderBy(users.fullName);
  return c.json(rows);
});

usersRoute.post("/", requireRole("owner", "admin"), zValidator("json", createUserInput), async (c) => {
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return c.json({ error: error?.message ?? "Failed to create auth account" }, 400);
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: data.user.id,
        fullName: input.fullName,
        email: input.email,
        roleId: input.roleId,
        branchId: input.branchId ?? null,
      })
      .returning();

    await recordAudit({ actorId: authUser.id, action: "create", entityType: "user", entityId: created.id, after: created });
    return c.json(created, 201);
  } catch (err) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
});

usersRoute.patch("/:id", requireRole("owner", "admin"), zValidator("json", updateUserInput), async (c) => {
  const id = c.req.param("id");
  const input = c.req.valid("json");
  const authUser = c.get("authUser");

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(users).set(input).where(eq(users.id, id)).returning();
  await recordAudit({ actorId: authUser.id, action: "update", entityType: "user", entityId: id, before, after: updated });

  return c.json(updated);
});

usersRoute.patch("/:id/active", requireRole("owner", "admin"), zValidator("json", z.object({ active: z.boolean() })), async (c) => {
  const id = c.req.param("id");
  const { active } = c.req.valid("json");
  const authUser = c.get("authUser");

  if (id === authUser.id) {
    return c.json({ error: "You cannot deactivate your own account" }, 400);
  }

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(users).set({ active }).where(eq(users.id, id)).returning();
  await recordAudit({
    actorId: authUser.id,
    action: active ? "reactivate" : "deactivate",
    entityType: "user",
    entityId: id,
    before,
    after: updated,
  });

  return c.json(updated);
});
