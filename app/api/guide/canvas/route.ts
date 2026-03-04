import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestionsForPhaseAndFramework, generateFollowUpsForCanvas } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { checkAiRateLimit } from "@/lib/rate-limit";
import { tryGetDb, getOrCreateProjectContext } from "@/lib/db";
import { retrieveTopChunks } from "@/lib/rag";

const schema = z.object({
  userPrompt: z.string().min(1).optional(),
  phase: z.string().min(1).optional(),
  framework: z.enum(["Univerzální", "Produktový"]).optional(),
  projectId: z.string().uuid().optional()
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
        { error: "Neplatná data.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userPrompt, phase: phaseParam, framework: frameworkParam, projectId } = parsed.data;

    let phase = phaseParam ?? "Iniciace";
    let framework: "Univerzální" | "Produktový" = frameworkParam ?? "Produktový";

    if (userPrompt?.trim()) {
      const { parsePromptForExtendedCanvas } = await import("@/lib/anthropic");
      const parsedCanvas = await parsePromptForExtendedCanvas({ userText: userPrompt });
      if (parsedCanvas.wantsCanvas) {
        framework = parsedCanvas.framework ?? framework;
        phase = parsedCanvas.phase ?? phase;
      }
    }

    // Načti projektový kontext a KB chunky pokud je k dispozici projektId
    let projectContext = "";
    if (projectId) {
      const db = tryGetDb();
      if (db) {
        const [contextRow, kbChunks] = await Promise.all([
          getOrCreateProjectContext(projectId),
          retrieveTopChunks({ projectId, queryText: `${phase} ${framework}`, limit: 4 })
        ]);
        const kbSummary = kbChunks.map((c) => c.content).join("\n").slice(0, 1200);
        projectContext = [
          contextRow.accumulated_context,
          kbSummary ? `Znalostní báze:\n${kbSummary}` : ""
        ].filter(Boolean).join("\n\n").trim();
      }
    }

    const questions = getQuestionsForPhaseAndFramework(phase, framework);
    const withFollowUps = await generateFollowUpsForCanvas({
      questions,
      framework,
      phase,
      projectContext: projectContext || undefined
    });

    return NextResponse.json({
      phase,
      framework,
      questions: withFollowUps.map((q) => ({
        name: q.questionName,
        hint: questions.find((x) => x.name === q.questionName)?.hint ?? "",
        context: questions.find((x) => x.name === q.questionName)?.context,
        followUps: q.followUps
      }))
    });
  } catch (e) {
    console.error("Canvas API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chyba generování canvasu" },
      { status: 500 }
    );
  }
}
