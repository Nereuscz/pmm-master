import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { kbDocumentUpdateSchema } from "@/lib/schemas";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();
  const payload = await request.json();
  const parsed = kbDocumentUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná data pro update.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = ensureDb();
  const { data: existing, error: existingError } = await db
    .from("kb_documents")
    .select("id,title,category,source,sharepoint_id,source_text,visibility,uploaded_by")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Dokument nebyl nalezen." }, { status: 404 });
  }

  const merged = {
    title: parsed.data.title ?? existing.title,
    category: parsed.data.category ?? existing.category,
    source: existing.source as "upload" | "sharepoint",
    content: parsed.data.content ?? existing.source_text ?? "",
    sharepointId: existing.sharepoint_id ?? undefined,
    uploadedBy: existing.uploaded_by ?? undefined,
    visibility: (parsed.data.visibility ?? existing.visibility ?? "global") as "global" | "team"
  };

  try {
    const result = await upsertDocumentWithChunks({
      documentId: params.id,
      ...merged
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown KB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const db = ensureDb();
  const now = new Date().toISOString();
  const { error } = await db.from("kb_documents").update({ deleted_at: now }).eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Smazání dokumentu selhalo." }, { status: 500 });
  }
  await db.from("kb_chunks").delete().eq("document_id", params.id);
  return NextResponse.json({ ok: true });
}
