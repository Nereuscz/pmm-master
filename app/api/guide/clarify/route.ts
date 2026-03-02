import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClarification } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  questionName: z.string().min(1),
  questionHint: z.string().min(1),
  userText: z.string().min(1),
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

    const result = await generateClarification(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    logApiError("/api/guide/clarify", e);
    const message = e instanceof Error ? e.message : "Chyba při detekci vysvětlení";
    return NextResponse.json({ isClarification: false, error: message }, { status: 500 });
  }
}
