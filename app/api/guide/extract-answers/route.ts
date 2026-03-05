import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractAnswersFromContext } from "@/lib/anthropic";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  transcript: z.string().min(1).max(100000),
  questions: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string().min(1),
      hint: z.string()
    })
  ),
  phase: z.string().min(1),
  framework: z.enum(["Univerzální", "Produktový"])
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

    const result = await extractAnswersFromContext(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    logApiError("/api/guide/extract-answers", e);
    const message = e instanceof Error ? e.message : "Chyba při extrakci odpovědí";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
