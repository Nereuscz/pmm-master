import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { sharepointSyncSchema } from "@/lib/schemas";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const started = Date.now();
  const payload = await request.json();
  const parsed = sharepointSyncSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná sync data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = ensureDb();
  let changesDetected = 0;
  const results: Array<{ sharepointId: string; status: string; documentId?: string; error?: string }> = [];

  for (const file of parsed.data.files) {
    try {
      const { data: existing } = await db
        .from("kb_documents")
        .select("id,title,category,source_text,visibility")
        .eq("sharepoint_id", file.sharepointId)
        .eq("source", "sharepoint")
        .maybeSingle();

      if (file.deleted) {
        if (existing?.id) {
          await db.from("kb_documents").update({ deleted_at: new Date().toISOString() }).eq("id", existing.id);
          await db.from("kb_chunks").delete().eq("document_id", existing.id);
          changesDetected += 1;
        }
        results.push({ sharepointId: file.sharepointId, status: "deleted" });
        continue;
      }

      if (!file.content) {
        results.push({
          sharepointId: file.sharepointId,
          status: "sync_error",
          error: "Soubor nemá obsah."
        });
        continue;
      }

      const update = await upsertDocumentWithChunks({
        documentId: existing?.id,
        title: file.title,
        category: file.category,
        source: "sharepoint",
        content: file.content,
        sharepointId: file.sharepointId,
        visibility: "global"
      });
      changesDetected += 1;
      results.push({ sharepointId: file.sharepointId, status: "indexed", documentId: update.documentId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      results.push({ sharepointId: file.sharepointId, status: "sync_error", error: message });
    }
  }

  const hasErrors = results.some((item) => item.status === "sync_error");
  await db.from("kb_sync_log").insert({
    source_path: parsed.data.sourcePath,
    file_id: null,
    status: hasErrors ? "partial" : "success",
    change_type: "batch_sync",
    changes_detected: changesDetected,
    duration_ms: Date.now() - started,
    synced_at: new Date().toISOString()
  });

  return NextResponse.json({
    status: hasErrors ? "partial" : "success",
    changesDetected,
    results
  });
}
