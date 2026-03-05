import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateRefinement } from "@/lib/anthropic";
import { ensureDb, getOrCreateProjectContext, requireProjectOwnership } from "@/lib/db";
import { getAsanaSnapshotForProject } from "@/lib/asana-sync";
import { getAuthUser, unauthorized, canProcess, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { logAudit } from "@/lib/audit";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  sessionId: z.string().uuid(),
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  existingOutput: z.string().min(10),
  refinementPrompt: z.string().min(3).max(1000)
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const rateLimit = await checkAiRateLimit(`ai:${user.id}`);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný vstup.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const db = ensureDb();

    const ownership = await requireProjectOwnership(input.projectId, user.id, isAdmin(user));
    if (!ownership.ok) {
      if (ownership.status === 403) return forbidden();
      return NextResponse.json({ error: ownership.message }, { status: 404 });
    }

    const [projectContextRow, asanaSnapshot] = await Promise.all([
      getOrCreateProjectContext(input.projectId),
      getAsanaSnapshotForProject(input.projectId),
    ]);

    const refined = await generateRefinement({
      existingOutput: input.existingOutput,
      refinementPrompt: input.refinementPrompt,
      phase: input.phase,
      framework: input.framework,
      projectContext: projectContextRow.accumulated_context,
      asanaContext: asanaSnapshot ?? undefined,
    });

    // Aktualizuj ai_output v existující session
    await db
      .from("sessions")
      .update({ ai_output: refined.content })
      .eq("id", input.sessionId);

    await logAudit({
      userId: user.id,
      action: "transcript_refine",
      resourceType: "session",
      resourceId: input.sessionId,
    });

    return NextResponse.json({ content: refined.content });
  } catch (e) {
    logApiError("/api/process/refine", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Doladění selhalo." },
      { status: 500 }
    );
  }
}
