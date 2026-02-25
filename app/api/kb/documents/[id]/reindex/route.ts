import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const payload = await request.json().catch(() => ({}));
  const db = ensureDb();

  const { data: existing, error } = await db
    .from("kb_documents")
    .select("id,title,category,source,sharepoint_id,source_text,visibility,uploaded_by")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !existing) {
    return NextResponse.json({ error: "Dokument nebyl nalezen." }, { status: 404 });
  }

  const content = typeof payload?.content === "string" ? payload.content : existing.source_text;
  if (!content || content.length < 20) {
    return NextResponse.json({ error: "Obsah dokumentu je příliš krátký." }, { status: 400 });
  }

  try {
    const result = await upsertDocumentWithChunks({
      documentId: params.id,
      title: existing.title,
      category: existing.category,
      source: existing.source as "upload" | "sharepoint",
      content,
      sharepointId: existing.sharepoint_id ?? undefined,
      uploadedBy: existing.uploaded_by ?? undefined,
      visibility: (existing.visibility ?? "global") as "global" | "team"
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reindex error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
