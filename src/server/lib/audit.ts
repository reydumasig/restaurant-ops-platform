import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export async function recordAudit(params: {
  actorId: string;
  action: "create" | "update" | "deactivate" | "reactivate";
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLogs).values({
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
