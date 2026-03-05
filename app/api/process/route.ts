import { NextRequest, NextResponse } from "next/server";
import { generateStructuredOutput } from "@/lib/anthropic";
import { retrieveTopChunks } from "@/lib/rag";
import { processTranscriptSchema } from "@/lib/schemas";
import { ensureDb, getLastSession, getOrCreateProjectContext, requireProjectOwnership } from "@/lib/db";
import { detectChangeSignals, extractContextSummary, buildContextBlock, mergeContextBlocks } from "@/lib/text";
import { getAuthUser, unauthorized, canProcess, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { logAudit } from "@/lib/audit";
import { checkAiRateLimit } from "@/lib/rate-limit";
import { searchMarket, buildQueryFromTranscript } from "@/lib/tavily";
import { getAsanaSnapshotForProject } from "@/lib/asana-sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const rateLimit = await checkAiRateLimit(`ai:${user.id}`);
  if (!rateLimit.success) return rateLimit.response;

  let jobId: string | null = null;
  let projectId: string | null = null;

  try {
    const parsed = processTranscriptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný vstup.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    projectId = input.projectId;
    const db = ensureDb();
    const startedAt = new Date().toISOString();

    const ownership = await requireProjectOwnership(input.projectId, user.id, isAdmin(user));
    if (!ownership.ok) {
      if (ownership.status === 403) return forbidden();
      return NextResponse.json({ error: ownership.message }, { status: 404 });
    }

    const { data: job, error: jobError } = await db
      .from("processing_jobs")
      .insert({
        project_id: input.projectId,
        status: "running",
        retry_count: 0
      })
      .select("id")
      .single();
    if (jobError || !job) {
      throw new Error(`Nepodařilo se založit processing job. ${jobError?.message ?? ""}`.trim());
    }
    jobId = job.id;

    const marketQuery = buildQueryFromTranscript(input.transcript);
    const [chunks, marketInsight] = await Promise.all([
      retrieveTopChunks({
        projectId: input.projectId,
        queryText: input.transcript,
        limit: 8
      }),
      searchMarket(marketQuery, input.framework as "Produktový" | "Univerzální")
    ]);

    const ragContext = chunks.map((chunk) => chunk.content);
    const lowKbConfidence = ragContext.length === 0;
    const [projectContextRow, lastSession, asanaSnapshot] = await Promise.all([
      getOrCreateProjectContext(input.projectId),
      getLastSession(input.projectId),
      getAsanaSnapshotForProject(input.projectId),
    ]);
    const changeSignals = detectChangeSignals(lastSession?.ai_output ?? "", input.transcript);

    const aiResult = await generateStructuredOutput({
      phase: input.phase,
      framework: input.framework,
      transcript: input.transcript,
      projectContext: projectContextRow.accumulated_context,
      ragContext: [...changeSignals, ...ragContext],
      marketInsight: marketInsight || undefined,
      contextNote: input.contextNote || undefined,
      asanaContext: asanaSnapshot ?? undefined,
    });

    const { data: insertedSession, error: sessionError } = await db
      .from("sessions")
      .insert({
        project_id: input.projectId,
        phase: input.phase,
        transcript: input.transcript,
        ai_output: aiResult.content,
        kb_chunks_used: chunks.map((chunk) => chunk.id),
        created_at: startedAt
      })
      .select("id")
      .single();
    if (sessionError || !insertedSession) {
      throw new Error(`Nepodařilo se uložit session. ${sessionError?.message ?? ""}`.trim());
    }

    const summary = extractContextSummary(aiResult.content);
    const block = buildContextBlock(input.phase, new Date().toISOString(), summary);
    const newContext = mergeContextBlocks(
      projectContextRow.accumulated_context,
      block,
      input.phase
    );

    await db
      .from("project_context")
      .update({
        accumulated_context: newContext,
        last_updated: new Date().toISOString()
      })
      .eq("project_id", input.projectId);

    await db
      .from("projects")
      .update({
        phase: input.phase,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.projectId);

    await db
      .from("processing_jobs")
      .update({
        status: "succeeded",
        session_id: insertedSession.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id);

    await logAudit({
      userId: user.id,
      action: "transcript_process",
      resourceType: "session",
      resourceId: insertedSession.id,
    });

    return NextResponse.json({
      sessionId: insertedSession.id,
      output: aiResult.content,
      meta: {
        lowKbConfidence,
        kbChunksUsed: chunks.length,
        changeSignals,
        marketInsightUsed: !!marketInsight
      }
    });
  } catch (error) {
    logApiError("/api/process", error);
    const message = error instanceof Error ? error.message : "Unknown processing error";
    if (jobId && projectId) {
      try {
        const db = ensureDb();
        await db
          .from("processing_jobs")
          .update({
            status: "failed_ai",
            error_code: "AI_PROCESSING_ERROR",
            error_message: message,
            updated_at: new Date().toISOString()
          })
          .eq("id", jobId);
      } catch {
        // intentionally ignored: primary error already captured
      }
    }

    return NextResponse.json(
      {
        error: "Zpracování transkriptu selhalo.",
        retryable: true,
        jobId,
        details: message
      },
      { status: 500 }
    );
  }
}
