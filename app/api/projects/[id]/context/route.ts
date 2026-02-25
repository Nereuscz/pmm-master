import { NextRequest, NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const db = ensureDb();
  const { data: project } = await db
    .from("projects")
    .select("owner_id")
    .eq("id", params.id)
    .single();
  if (!project) return NextResponse.json({ error: "Projekt nebyl nalezen." }, { status: 404 });
  if (!isAdmin(user) && project.owner_id !== user.id) return forbidden();
  const { data, error } = await db
    .from("project_context")
    .select("project_id,accumulated_context,last_updated")
    .eq("project_id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst kontext." }, { status: 500 });
  }

  return NextResponse.json({
    context: data ?? {
      project_id: params.id,
      accumulated_context: "",
      last_updated: null
    }
  });
}
