import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClarifyingQuestions } from "@/lib/anthropic";
import { getOrCreateProjectContext, requireProjectOwnership } from "@/lib/db";
import { getAuthUser, unauthorized, canProcess, forbidden, isAdmin } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  transcript: z.string().min(50)
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
    const ownership = await requireProjectOwnership(input.projectId, user.id, isAdmin(user));
    if (!ownership.ok) {
      if (ownership.status === 403) return forbidden();
      return NextResponse.json({ error: ownership.message }, { status: 404 });
    }

    const projectContext = await getOrCreateProjectContext(input.projectId);

    const result = await generateClarifyingQuestions({
      phase: input.phase,
      framework: input.framework,
      transcript: input.transcript,
      projectContext: projectContext.accumulated_context
    });

    return NextResponse.json(result);
  } catch (e) {
    logApiError("/api/process/clarify", e);
    const message = e instanceof Error ? e.message : "Chyba při analýze";
    return NextResponse.json({ error: message, questions: [] }, { status: 500 });
  }
}
