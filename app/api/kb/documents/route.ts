import { NextRequest, NextResponse } from "next/server";
import { ensureDb, requireProjectOwnership } from "@/lib/db";
import { kbDocumentCreateSchema } from "@/lib/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { getAuthUser, unauthorized, canReadKb, canManageKb, forbidden, isAdmin } from "@/lib/auth-guard";

const KB_DOCUMENT_SELECT =
  "id,title,category,source,source_url,sharepoint_id,visibility,project_id,created_at,deleted_at";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canReadKb(user)) return forbidden();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const db = ensureDb();
  const admin = isAdmin(user);

  if (projectId) {
    const parsedProjectId = z.string().uuid().safeParse(projectId);
    if (!parsedProjectId.success) {
      return NextResponse.json({ error: "Neplatný projectId." }, { status: 400 });
    }

    const ownership = await requireProjectOwnership(parsedProjectId.data, user.id, admin);
    if (!ownership.ok) {
      if (ownership.status === 403) return forbidden();
      return NextResponse.json({ error: ownership.message }, { status: 404 });
    }

    const [sharedRes, projectRes] = await Promise.all([
      db
        .from("kb_documents")
        .select(KB_DOCUMENT_SELECT)
        .is("deleted_at", null)
        .in("visibility", ["global", "team"])
        .order("created_at", { ascending: false }),
      db
        .from("kb_documents")
        .select(KB_DOCUMENT_SELECT)
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

  if (admin) {
    const { data, error } = await db
      .from("kb_documents")
      .select(KB_DOCUMENT_SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Nepodařilo se načíst dokumenty." }, { status: 500 });
    }
    return NextResponse.json({ documents: data });
  }

  const [{ data: sharedDocs, error: sharedError }, { data: ownedProjects, error: projectsError }] =
    await Promise.all([
      db
        .from("kb_documents")
        .select(KB_DOCUMENT_SELECT)
        .is("deleted_at", null)
        .in("visibility", ["global", "team"])
        .order("created_at", { ascending: false }),
      db
        .from("projects")
        .select("id")
        .eq("owner_id", user.id),
    ]);

  if (sharedError || projectsError) {
    return NextResponse.json({ error: "Nepodařilo se načíst dokumenty." }, { status: 500 });
  }

  const ownedProjectIds = (ownedProjects ?? []).map((project) => project.id);
  if (ownedProjectIds.length === 0) {
    return NextResponse.json({ documents: sharedDocs ?? [] });
  }

  const { data: ownedProjectDocs, error: projectDocsError } = await db
    .from("kb_documents")
    .select(KB_DOCUMENT_SELECT)
    .is("deleted_at", null)
    .eq("visibility", "project")
    .in("project_id", ownedProjectIds)
    .order("created_at", { ascending: false });

  if (projectDocsError) {
    return NextResponse.json({ error: "Nepodařilo se načíst dokumenty." }, { status: 500 });
  }

  const merged = [...(sharedDocs ?? []), ...(ownedProjectDocs ?? [])];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ documents: merged });
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
