import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getQuestionsForPhaseAndFramework } from "@/lib/anthropic";
import { generateFollowUpsForCanvas } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  userPrompt: z.string().min(1).optional(),
  phase: z.string().min(1).optional(),
  framework: z.enum(["Univerzální", "Produktový"]).optional()
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

    const { userPrompt, phase: phaseParam, framework: frameworkParam } = parsed.data;

    let phase = phaseParam ?? "Iniciace";
    let framework: "Univerzální" | "Produktový" = frameworkParam ?? "Produktový";

    if (userPrompt?.trim()) {
      const { parsePromptForExtendedCanvas } = await import("@/lib/anthropic");
      const parsed = await parsePromptForExtendedCanvas({ userText: userPrompt });
      if (parsed.wantsCanvas) {
        framework = parsed.framework ?? framework;
        phase = parsed.phase ?? phase;
      }
    }

    const questions = getQuestionsForPhaseAndFramework(phase, framework);
    const withFollowUps = await generateFollowUpsForCanvas({
      questions,
      framework,
      phase
    });

    return NextResponse.json({
      phase,
      framework,
      questions: withFollowUps.map((q) => ({
        name: q.questionName,
        hint: questions.find((x) => x.name === q.questionName)?.hint ?? "",
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
