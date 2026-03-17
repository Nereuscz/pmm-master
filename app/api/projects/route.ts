import { NextRequest, NextResponse } from "next/server";
import { createProjectSchema } from "@/lib/schemas";
import { ensureDb, ensureUser } from "@/lib/db";
import { getAuthUser, unauthorized, canProcess } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = ensureDb();
  let query = db
    .from("projects")
    .select("id,name,framework,phase,owner_id,asana_project_id,created_at,updated_at")
    .order("updated_at", { ascending: false });

  // Každý uživatel vidí jen projekty, které vytvořil
  query = query.eq("owner_id", user.id);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst projekty." }, { status: 500 });
  }
  return NextResponse.json({ projects: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) {
    return NextResponse.json({ error: "Nedostatečná oprávnění." }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createProjectSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Neplatná data projektu.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const db = ensureDb();
    const ownerId = user.id;
    await ensureUser(ownerId);

    const { data, error } = await db
      .from("projects")
      .insert({
        name: parsed.data.name,
        framework: parsed.data.framework,
        phase: parsed.data.phase,
        owner_id: ownerId
      })
      .select("id,name,framework,phase,owner_id,created_at,updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Nepodařilo se vytvořit projekt.", details: error?.message },
        { status: 500 }
      );
    }

    const { error: contextError } = await db.from("project_context").upsert({
      project_id: data.id,
      accumulated_context: "",
      last_updated: new Date().toISOString()
    });
    if (contextError) {
      return NextResponse.json(
        { error: "Nepodařilo se inicializovat projektový kontext.", details: contextError.message },
        { status: 500 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "project_create",
      resourceType: "project",
      resourceId: data.id,
    });

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznámá chyba";
    return NextResponse.json({ error: "Nepodařilo se vytvořit projekt.", details: message }, { status: 500 });
  }
}
