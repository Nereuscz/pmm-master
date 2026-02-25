import { NextRequest, NextResponse } from "next/server";
import { generateStructuredOutput } from "@/lib/anthropic";
import { retrieveTopChunks } from "@/lib/rag";
import { processTranscriptSchema } from "@/lib/schemas";
import { ensureDb, getLastSession, getOrCreateProjectContext, requireProject } from "@/lib/db";
import { detectChangeSignals, summarizeForContext } from "@/lib/text";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();
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

    await requireProject(input.projectId);

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

    const chunks = await retrieveTopChunks({
      projectId: input.projectId,
      queryText: input.transcript,
      limit: 8
    });

    const ragContext = chunks.map((chunk) => chunk.content);
    const lowKbConfidence = ragContext.length === 0;
    const projectContextRow = await getOrCreateProjectContext(input.projectId);
    const lastSession = await getLastSession(input.projectId);
    const changeSignals = detectChangeSignals(lastSession?.ai_output ?? "", input.transcript);

    const aiResult = await generateStructuredOutput({
      phase: input.phase,
      framework: input.framework,
      transcript: input.transcript,
      projectContext: projectContextRow.accumulated_context,
      ragContext: [...changeSignals, ...ragContext]
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

    const existingContext = projectContextRow.accumulated_context.trim();
    const contextEntry = summarizeForContext(
      `Datum: ${new Date().toISOString()}
Fáze: ${input.phase}
Shrnutí: ${aiResult.content}`
    );
    const newContext = summarizeForContext(`${existingContext}\n\n${contextEntry}`.trim(), 8000);

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

    return NextResponse.json({
      sessionId: insertedSession.id,
      output: aiResult.content,
      meta: {
        lowKbConfidence,
        kbChunksUsed: chunks.length,
        changeSignals
      }
    });
  } catch (error) {
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
