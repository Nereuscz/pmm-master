import { NextResponse } from "next/server";
import { tryGetDb } from "@/lib/db";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databáze není nakonfigurovaná." },
      { status: 503 }
    );
  }

  const { data, error } = await db
    .from("asana_sync_log")
    .select(`
      id,
      project_id,
      status,
      error_message,
      duration_ms,
      synced_at,
      projects (name)
    `)
    .order("synced_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst Asana sync log." }, { status: 500 });
  }

  const logs = (data ?? []).map((row: Record<string, unknown>) => {
    const projects = row.projects as { name?: string } | null | undefined;
    return {
      id: row.id,
      project_id: row.project_id,
      project_name: projects?.name ?? null,
      status: row.status,
      error_message: row.error_message ?? null,
      duration_ms: row.duration_ms ?? null,
      synced_at: row.synced_at,
    };
  });

  return NextResponse.json({ logs });
}
