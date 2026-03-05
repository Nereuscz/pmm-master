import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { updateProjectSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function resolveProject(projectId: string) {
  const db = ensureDb();
  const { data, error } = await db
    .from("projects")
    .select("id,name,framework,phase,owner_id,asana_project_id,asana_task_id,description,asana_metadata,created_at,updated_at")
    .eq("id", projectId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function GET(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const project = await resolveProject(params.id);
  if (!project) return NextResponse.json({ error: "Projekt nebyl nalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const project = await resolveProject(params.id);
  if (!project) return NextResponse.json({ error: "Projekt nebyl nalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  const payload = await request.json();
  const parsed = updateProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná data pro update.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const db = ensureDb();
  const updateData = { ...parsed.data, updated_at: new Date().toISOString() };
  const { data, error } = await db
    .from("projects")
    .update(updateData)
    .eq("id", params.id)
    .select("id,name,framework,phase,owner_id,asana_project_id,asana_task_id,description,asana_metadata,created_at,updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Projekt nebyl nalezen." }, { status: 404 });
  }
  await logAudit({
    userId: user.id,
    action: "project_update",
    resourceType: "project",
    resourceId: params.id,
  });
  return NextResponse.json({ project: data });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const project = await resolveProject(params.id);
  if (!project) return NextResponse.json({ error: "Projekt nebyl nalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  const db = ensureDb();
  const { error } = await db.from("projects").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Smazání projektu selhalo." }, { status: 500 });
  }
  await logAudit({
    userId: user.id,
    action: "project_delete",
    resourceType: "project",
    resourceId: params.id,
  });
  return NextResponse.json({ ok: true });
}
