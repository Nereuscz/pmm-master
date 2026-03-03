import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, isAdmin, forbidden } from "@/lib/auth-guard";
import { tryGetDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json({ error: "Databáze není dostupná." }, { status: 503 });
  }

  const { data, error } = await db
    .from("audit_log")
    .select("id,user_id,action,resource_type,resource_id,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Nepodařilo se načíst audit log." }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
