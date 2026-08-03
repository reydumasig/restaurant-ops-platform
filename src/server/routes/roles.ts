import { Hono } from "hono";
import { db } from "@/db/client";
import { roles } from "@/db/schema";
import type { AuthVariables } from "@/server/middleware/auth";

export const rolesRoute = new Hono<{ Variables: AuthVariables }>();

rolesRoute.get("/", async (c) => {
  const rows = await db.select().from(roles).orderBy(roles.name);
  return c.json(rows);
});
