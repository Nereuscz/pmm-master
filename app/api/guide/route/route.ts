import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { TextBlock } from "@anthropic-ai/sdk/resources";
import { anthropic, withRetry } from "@/lib/anthropic/client";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  message: z.string().min(1).max(500),
  phase: z.string().optional(),
  framework: z.string().optional(),
  projectName: z.string().optional(),
});

const SYSTEM = `Klasifikuješ záměr uživatele PM asistenta. Vrať POUZE validní JSON bez dalšího textu.

Možné záměry:
- "guide": průvodce, strukturovaný rozhovor, projít PM otázky jednu po druhé, vygenerovat PM dokumentaci
- "canvas": canvas, připravit se na schůzku, sada otázek najednou, celý set otázek, příprava
- "general": cokoliv jiného – pozdrav, obecný dotaz, nesouvisející téma

Pokud text zmiňuje konkrétní fázi projektu (Iniciace/Plánování/Realizace/Closing/Gate 1/Gate 2/Gate 3), přidej "phaseOverride".
Pokud text zmiňuje framework (Univerzální/Produktový), přidej "frameworkOverride".
Pokud je záměr "general", přidej "response": jedna stručná věta v češtině, co nabídnout.

Příklady:
"chci projít otázky" → {"intent":"guide"}
"udělej canvas" → {"intent":"canvas"}
"příprava na schůzku pro Iniciaci" → {"intent":"canvas","phaseOverride":"Iniciace"}
"ahoj" → {"intent":"general","response":"Ahoj! Mohu tě provést PM průvodcem nebo připravit sadu otázek na schůzku."}`;

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const rateLimit = await checkAiRateLimit(`ai:${user.id}`);
  if (!rateLimit.success) return rateLimit.response;

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Neplatný vstup." }, { status: 400 });
    }

    const { message, phase, framework, projectName } = parsed.data;

    // Fallback keyword routing when Anthropic API není dostupná
    if (!anthropic) {
      const lower = message.toLowerCase();
      if (
        lower.includes("canvas") ||
        lower.includes("schůzk") ||
        lower.includes("příprava") ||
        lower.includes("sada otázek")
      ) {
        return NextResponse.json({ intent: "canvas", phaseOverride: null, frameworkOverride: null });
      }
      return NextResponse.json({ intent: "guide", phaseOverride: null, frameworkOverride: null });
    }

    const client = anthropic;
    const ctx = [
      projectName ? `projekt: ${projectName}` : null,
      phase ? `fáze: ${phase}` : null,
      framework ? `framework: ${framework}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const userContent = ctx
      ? `Záměr uživatele (kontext – ${ctx}): "${message}"`
      : `Záměr uživatele: "${message}"`;

    const resp = await withRetry(() =>
      client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      })
    );

    const raw = (resp.content[0] as TextBlock).text.trim();
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      intent: (result.intent as string) ?? "guide",
      phaseOverride: (result.phaseOverride as string) ?? null,
      frameworkOverride: (result.frameworkOverride as string) ?? null,
      response: (result.response as string) ?? null,
    });
  } catch (e) {
    logApiError("/api/guide/route", e);
    // Fallback: default to guide
    return NextResponse.json({ intent: "guide", phaseOverride: null, frameworkOverride: null });
  }
}
