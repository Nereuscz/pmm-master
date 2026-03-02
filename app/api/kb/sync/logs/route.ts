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
    .from("kb_sync_log")
    .select("id,source_path,status,change_type,changes_detected,duration_ms,synced_at")
    .order("synced_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst sync log." }, { status: 500 });
  }
  return NextResponse.json({ logs: data });
}
