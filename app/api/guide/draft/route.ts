import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  answers: z.array(z.any()),
  messages: z.array(z.any()),
  uploadedContext: z.string().optional(),
});

const deleteSchema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
});

// ── GET ?projectId=&phase=&framework= ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? "";
  const phase = searchParams.get("phase") ?? "";
  const framework = searchParams.get("framework") ?? "";

  if (!projectId || !phase || !framework) {
    return NextResponse.json({ error: "Chybí parametry." }, { status: 400 });
  }

  const db = ensureDb();
  const { data } = await db
    .from("guide_drafts")
    .select("id, answers, messages, uploaded_context, updated_at")
    .eq("project_id", projectId)
    .eq("phase", phase)
    .eq("framework", framework)
    .eq("owner_id", user.id)
    .single();

  return NextResponse.json({ draft: data ?? null });
}

// ── PUT { projectId, phase, framework, answers, messages } ────────────────────

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = upsertSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, phase, framework, answers, messages, uploadedContext } = parsed.data;
  const db = ensureDb();

  try {
    await db.from("guide_drafts").upsert(
      {
        project_id: projectId,
        phase,
        framework,
        owner_id: user.id,
        answers,
        messages,
        uploaded_context: uploadedContext ?? "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,phase,framework,owner_id" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError("/api/guide/draft PUT", e);
    return NextResponse.json({ error: "Uložení draftu selhalo." }, { status: 500 });
  }
}

// ── DELETE { projectId, phase, framework } ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup." }, { status: 400 });
  }

  const { projectId, phase, framework } = parsed.data;
  const db = ensureDb();

  try {
    await db
      .from("guide_drafts")
      .delete()
      .eq("project_id", projectId)
      .eq("phase", phase)
      .eq("framework", framework)
      .eq("owner_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError("/api/guide/draft DELETE", e);
    return NextResponse.json({ error: "Smazání draftu selhalo." }, { status: 500 });
  }
}
