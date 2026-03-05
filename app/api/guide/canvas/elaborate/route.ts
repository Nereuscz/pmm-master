import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { elaborateCanvasSection } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";
import { tryGetDb, getOrCreateProjectContext } from "@/lib/db";
import { retrieveTopChunks } from "@/lib/rag";

const schema = z.object({
  sectionId: z.string().min(1),
  questionName: z.string().min(1),
  questionHint: z.string().min(1),
  currentContent: z.string(),
  selectedText: z.string().optional(),
  userPrompt: z.string().optional(),
  projectId: z.string().uuid().optional(),
  uploadedContext: z.string().optional(),
  framework: z.enum(["Univerzální", "Produktový"]),
  phase: z.string().min(1)
});

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

    const { sectionId, questionName, questionHint, currentContent, selectedText, userPrompt, projectId, uploadedContext, framework, phase } =
      parsed.data;

    let projectContext = "";
    if (projectId) {
      const db = tryGetDb();
      if (db) {
        const [contextRow, kbChunks] = await Promise.all([
          getOrCreateProjectContext(projectId),
          retrieveTopChunks({ projectId, queryText: `${phase} ${framework} ${questionName}`, limit: 4 })
        ]);
        const kbSummary = kbChunks.map((c) => c.content).join("\n").slice(0, 1200);
        projectContext = [
          contextRow.accumulated_context,
          kbSummary ? `Znalostní báze:\n${kbSummary}` : ""
        ]
          .filter(Boolean)
          .join("\n\n")
          .trim();
      }
    }

    const result = await elaborateCanvasSection({
      sectionId,
      questionName,
      questionHint,
      currentContent,
      selectedText,
      userPrompt,
      projectContext: projectContext || undefined,
      uploadedContext,
      framework,
      phase
    });

    return NextResponse.json(result);
  } catch (e) {
    logApiError("/api/guide/canvas/elaborate", e);
    const message = e instanceof Error ? e.message : "Chyba při doplňování sekce";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
