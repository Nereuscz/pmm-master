import { NextResponse } from "next/server";
import { tryGetDb } from "@/lib/db";

export async function GET() {
  const db = tryGetDb();
  if (db) {
    const { error } = await db.from("projects").select("id").limit(1).maybeSingle();
    if (error) {
      return NextResponse.json(
        { ok: false, ts: new Date().toISOString(), error: "DB unreachable" },
        { status: 503 }
      );
    }
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
