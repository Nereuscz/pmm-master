import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateFollowUpQuestions } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";

const schema = z.object({
  questionName: z.string().min(1),
  questionHint: z.string().min(1),
  userAnswer: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"]),
  phase: z.string().min(1)
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

    const result = await generateFollowUpQuestions(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chyba při generování follow-up otázek";
    return NextResponse.json({ error: message, followUps: [] }, { status: 500 });
  }
}
