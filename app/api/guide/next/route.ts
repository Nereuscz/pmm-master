import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestionsForPhase } from "@/lib/guide";
import { generateStructuredOutput } from "@/lib/anthropic";
import { retrieveTopChunks } from "@/lib/rag";
import { tryGetDb, requireProjectOwnership, getOrCreateProjectContext } from "@/lib/db";
import { extractContextSummary, buildContextBlock, mergeContextBlocks } from "@/lib/text";
import { getAuthUser, unauthorized, canProcess, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { logAudit } from "@/lib/audit";
import { checkAiRateLimit } from "@/lib/rate-limit";
import { searchMarket, buildQueryFromAnswers } from "@/lib/tavily";

const schema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      question: z.string().min(1),
      answer: z.string()
    })
  ),
  uploadedContext: z.string().optional()
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const rateLimit = await checkAiRateLimit(`ai:${user.id}`);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const payload = await request.json();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatná data průvodce.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // ── 1. Vrať další otázku (nevyžaduje DB) ──────────────────────────────────
    const questions = getQuestionsForPhase(input.phase, input.framework);
    const next = questions[input.answers.length] ?? null;
    if (next) {
      return NextResponse.json({
        done: false,
        nextQuestion: next,
        totalCount: questions.length
      });
    }

    // ── 2. Všechny otázky zodpovězeny – vygeneruj výstup ─────────────────────
    const transcriptFromAnswers = input.answers
      .map((item) => `Otázka: ${item.question}\nOdpověď: ${item.answer}`)
      .join("\n\n");

    const marketQuery = buildQueryFromAnswers(
      input.answers.map((a) => ({ question: a.question, answer: a.answer }))
    );

    // Zkus získat projektový kontext a KB chunky (neblokující – DB může chybět)
    const db = tryGetDb();

    const [projectContext, kbChunks, marketInsight] = await Promise.all([
      db
        ? getOrCreateProjectContext(input.projectId)
        : Promise.resolve({ accumulated_context: "", project_id: input.projectId, last_updated: null }),
      db
        ? retrieveTopChunks({ projectId: input.projectId, queryText: transcriptFromAnswers, limit: 6 })
        : Promise.resolve([]),
      searchMarket(marketQuery, input.framework)
    ]);

    const generated = await generateStructuredOutput({
      phase: input.phase,
      framework: input.framework,
      transcript: transcriptFromAnswers,
      projectContext: projectContext.accumulated_context,
      ragContext: kbChunks.map((item) => item.content),
      marketInsight: marketInsight || undefined,
      uploadedContext: input.uploadedContext
    });

    // ── 3. Ulož session do DB (pokud je k dispozici) ──────────────────────────
    if (!db) {
      // Dev mode bez DB – výstup zobrazíme, ale neuložíme
      return NextResponse.json({
        done: true,
        sessionId: null,
        projectId: input.projectId,
        output: generated.content,
        saved: false,
        totalCount: questions.length
      });
    }

    const ownership = await requireProjectOwnership(input.projectId, user.id, isAdmin(user));
    if (!ownership.ok) {
      if (ownership.status === 403) return forbidden();
      return NextResponse.json({ error: ownership.message }, { status: 404 });
    }

    const { data: session, error } = await db
      .from("sessions")
      .insert({
        project_id: input.projectId,
        phase: input.phase,
        transcript: transcriptFromAnswers,
        ai_output: generated.content,
        kb_chunks_used: kbChunks.map((item) => item.id)
      })
      .select("id")
      .single();

    if (error || !session) {
      throw new Error("Nepodařilo se uložit session z průvodce.");
    }

    // Aktualizuj project_context
    const summary = extractContextSummary(generated.content);
    const block = buildContextBlock(input.phase, new Date().toISOString(), summary);
    const newContext = mergeContextBlocks(
      projectContext.accumulated_context,
      block,
      input.phase
    );

    await db
      .from("project_context")
      .update({ accumulated_context: newContext, last_updated: new Date().toISOString() })
      .eq("project_id", input.projectId);

    // Aktualizuj fázi projektu
    await db
      .from("projects")
      .update({ phase: input.phase, updated_at: new Date().toISOString() })
      .eq("id", input.projectId);

    await logAudit({
      userId: user.id,
      action: "guide_complete",
      resourceType: "session",
      resourceId: session.id,
    });

    return NextResponse.json({
      done: true,
      sessionId: session.id,
      projectId: input.projectId,
      output: generated.content,
      saved: true,
      totalCount: questions.length
    });
  } catch (e) {
    logApiError("/api/guide/next", e);
    const message = e instanceof Error ? e.message : "Unknown guide error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
