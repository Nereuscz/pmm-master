import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";
import { generateProjectMemorySummary } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

/** POST: vygenerovat anotace z accumulated_context a uložit */
export async function POST(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = ensureDb();
  const { data: project } = await db
    .from("projects")
    .select("name, framework, owner_id")
    .eq("id", params.id)
    .single();

  if (!project) return NextResponse.json({ error: "Projekt nenalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  const { data: ctx } = await db
    .from("project_context")
    .select("accumulated_context")
    .eq("project_id", params.id)
    .maybeSingle();

  const accumulated = ctx?.accumulated_context?.trim() ?? "";
  if (!accumulated) {
    return NextResponse.json(
      { error: "Žádný kontext k anotaci. Nejprve zpracuj transkript nebo dokonči průvodce." },
      { status: 400 }
    );
  }

  try {
    const result = await generateProjectMemorySummary({
      projectName: project.name,
      framework: project.framework,
      accumulatedContext: accumulated
    });

    const now = new Date().toISOString();
    await db
      .from("project_context")
      .upsert(
        {
          project_id: params.id,
          accumulated_context: accumulated,
          annotations: result.summary,
          annotations_updated: now
        },
        { onConflict: "project_id" }
      );

    return NextResponse.json({
      annotations: result.summary,
      annotations_updated: now
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chyba generování";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH: uložit manuální úpravu anotací */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = ensureDb();
  const { data: project } = await db
    .from("projects")
    .select("owner_id")
    .eq("id", params.id)
    .single();

  if (!project) return NextResponse.json({ error: "Projekt nenalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

  let body: { annotations?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const annotations = typeof body.annotations === "string" ? body.annotations : "";

  const { data: ctx } = await db
    .from("project_context")
    .select("accumulated_context")
    .eq("project_id", params.id)
    .maybeSingle();

  const accumulated = ctx?.accumulated_context ?? "";

  const now = new Date().toISOString();
  const { error } = await db
    .from("project_context")
    .upsert(
      {
        project_id: params.id,
        accumulated_context: accumulated,
        annotations,
        annotations_updated: now
      },
      { onConflict: "project_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Nepodařilo se uložit." }, { status: 500 });
  }

  return NextResponse.json({ annotations, annotations_updated: now });
}
