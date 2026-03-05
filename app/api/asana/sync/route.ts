import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ensureDb } from "@/lib/db";
import { syncProjectAsanaSnapshot } from "@/lib/asana-sync";

export const dynamic = "force-dynamic";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Neautorizováno." }, { status: 401 });
  }

  const db = ensureDb();
  const { data: projects } = await db
    .from("projects")
    .select("id")
    .not("asana_project_id", "is", null);

  if (!projects?.length) {
    return NextResponse.json({
      status: "ok",
      synced: 0,
      errors: [],
      message: "Žádné projekty s propojenou Asanou.",
    });
  }

  const results: Array<{ projectId: string; ok: boolean; error?: string }> = [];
  let synced = 0;

  for (const p of projects) {
    const result = await syncProjectAsanaSnapshot(p.id);
    if (result.ok) {
      synced += 1;
      results.push({ projectId: p.id, ok: true });
    } else {
      results.push({ projectId: p.id, ok: false, error: result.error });
    }
  }

  const errors = results.filter((r) => !r.ok).map((r) => ({ projectId: r.projectId, error: r.error }));

  return NextResponse.json({
    status: "ok",
    synced,
    total: projects.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
