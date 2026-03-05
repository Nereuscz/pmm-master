import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { kbDocumentCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canReadKb, canManageKb, forbidden } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canReadKb(user)) return forbidden();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const db = ensureDb();
  let query = db
    .from("kb_documents")
    .select("id,title,category,source,source_url,sharepoint_id,visibility,project_id,created_at,deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.or(`visibility.in.(global,team),and(visibility.eq.project,project_id.eq.${projectId})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst dokumenty." }, { status: 500 });
  }
  return NextResponse.json({ documents: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const payload = await request.json();
  const parsed = kbDocumentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná data KB dokumentu.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await upsertDocumentWithChunks({
      ...parsed.data,
      sharepointId: parsed.data.sharepointId,
      projectId: parsed.data.projectId
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown KB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
