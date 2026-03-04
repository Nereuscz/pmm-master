import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";
import { tryGetDb } from "@/lib/db";
import { generateProjectMemorySummary } from "@/lib/anthropic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({ summary: null, error: "DB není dostupná" }, { status: 503 });
  }

  try {
    // Načti projekt (název, framework, owner_id pro ownership check)
    const { data: project, error: projectError } = await db
      .from("projects")
      .select("name, framework, owner_id")
      .eq("id", params.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Projekt nenalezen" }, { status: 404 });
    }
    if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();

    // Načti kontext
    const { data: context } = await db
      .from("project_context")
      .select("accumulated_context")
      .eq("project_id", params.id)
      .maybeSingle();

    if (!context?.accumulated_context?.trim()) {
      return NextResponse.json({ summary: null });
    }

    const result = await generateProjectMemorySummary({
      projectName: project.name,
      framework: project.framework,
      accumulatedContext: context.accumulated_context
    });

    return NextResponse.json({ summary: result.summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chyba generování shrnutí";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
