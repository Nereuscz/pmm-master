import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { kbDocumentCreateSchema } from "@/lib/schemas";
import { z } from "zod";

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

  if (projectId) {
    const parsedProjectId = z.string().uuid().safeParse(projectId);
    if (!parsedProjectId.success) {
      return NextResponse.json({ error: "Neplatný projectId." }, { status: 400 });
    }

    const [sharedRes, projectRes] = await Promise.all([
      db
        .from("kb_documents")
        .select("id,title,category,source,source_url,sharepoint_id,visibility,project_id,created_at,deleted_at")
        .is("deleted_at", null)
        .in("visibility", ["global", "team"])
        .order("created_at", { ascending: false }),
      db
        .from("kb_documents")
        .select("id,title,category,source,source_url,sharepoint_id,visibility,project_id,created_at,deleted_at")
        .is("deleted_at", null)
        .eq("visibility", "project")
        .eq("project_id", parsedProjectId.data)
        .order("created_at", { ascending: false }),
    ]);

    if (sharedRes.error || projectRes.error) {
      return NextResponse.json({ error: "Nepodařilo se načíst dokumenty." }, { status: 500 });
    }

    const merged = [...(sharedRes.data ?? []), ...(projectRes.data ?? [])];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json({ documents: merged });
  }

  const { data, error } = await db
    .from("kb_documents")
    .select("id,title,category,source,source_url,sharepoint_id,visibility,project_id,created_at,deleted_at")
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
      sharepointId: parsed.data.sharepointId,
      projectId: parsed.data.projectId
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown KB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
