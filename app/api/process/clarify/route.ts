import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClarifyingQuestions } from "@/lib/anthropic";
import { getOrCreateProjectContext, requireProject } from "@/lib/db";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";

const schema = z.object({
  projectId: z.string().uuid(),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  transcript: z.string().min(50)
});

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Neplatný vstup.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    await requireProject(input.projectId);

    const projectContext = await getOrCreateProjectContext(input.projectId);

    const result = await generateClarifyingQuestions({
      phase: input.phase,
      framework: input.framework,
      transcript: input.transcript,
      projectContext: projectContext.accumulated_context
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chyba při analýze";
    return NextResponse.json({ error: message, questions: [] }, { status: 500 });
  }
}
