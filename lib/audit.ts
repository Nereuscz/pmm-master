import { tryGetDb } from "./db";

export type AuditAction =
  | "project_create"
  | "project_update"
  | "project_delete"
  | "transcript_process"
  | "guide_complete"
  | "asana_export"
  | "kb_upload"
  | "kb_delete";

export async function logAudit(input: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
}): Promise<void> {
  const db = tryGetDb();
  if (!db) return;

  await db.from("audit_log").insert({
    user_id: input.userId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
  });
}
