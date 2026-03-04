import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { getAuthUser, unauthorized, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

const patchSchema = z.object({
  ai_output: z.string().min(1).max(200_000),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatný vstup.", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = ensureDb();

  // Fetch the session and verify ownership via the linked project
  const { data: session } = await db
    .from("sessions")
    .select("id, project_id, projects!inner(owner_id)")
    .eq("id", params.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session nebyla nalezena." }, { status: 404 });
  }

  const ownerId = (session.projects as { owner_id: string }).owner_id;
  if (!isAdmin(user) && ownerId !== user.id) return forbidden();

  try {
    const { error } = await db
      .from("sessions")
      .update({ ai_output: parsed.data.ai_output })
      .eq("id", params.id);

    if (error) throw error;

    await logAudit({
      userId: user.id,
      action: "session_edit",
      resourceType: "session",
      resourceId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    logApiError("/api/sessions/[id]", e);
    return NextResponse.json({ error: "Uložení selhalo." }, { status: 500 });
  }
}
