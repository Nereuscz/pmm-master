import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { kbDocumentCreateSchema } from "@/lib/schemas";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canReadKb, canManageKb, forbidden } from "@/lib/auth-guard";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canReadKb(user)) return forbidden();

  const db = ensureDb();
  const { data, error } = await db
    .from("kb_documents")
    .select("id,title,category,source,sharepoint_id,visibility,created_at,deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

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
      sharepointId: parsed.data.sharepointId
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown KB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
