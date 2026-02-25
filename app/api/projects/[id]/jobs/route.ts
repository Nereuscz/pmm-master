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
    .from("processing_jobs")
    .select("id,status,error_code,error_message,retry_count,created_at,updated_at")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst processing jobs." }, { status: 500 });
  }
  return NextResponse.json({ jobs: data });
}
