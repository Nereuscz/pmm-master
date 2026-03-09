import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, canProcess, forbidden, isAdmin } from "@/lib/auth-guard";
import { env } from "@/lib/env";
import { requireProjectOwnership, tryGetDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const REALTIME_TOOLS = [
  {
    type: "function" as const,
    name: "submit_answer",
    description:
      "Uloží odpověď uživatele na aktuální PM otázku a získá další otázku nebo finální výstup. Zavolej vždy, když uživatel odpověděl na položenou otázku.",
    parameters: {
      type: "object" as const,
      properties: {
        answer: {
          type: "string" as const,
          description: "Odpověď uživatele na PM otázku.",
        },
      },
      required: ["answer" as const],
    },
  },
];

function buildInstructions(
  phase: string,
  framework: string,
  currentQuestion: string,
  hint: string
): string {
  return `Jsi PM průvodce pro JIC (Jihomoravské inovační centrum). Provázíš uživatele strukturovanými PM otázkami.

DŮLEŽITÉ:
- Odpovídej VŽDY v češtině.
- Mluv stručně a přirozeně.
- Aktuální fáze: ${phase}. Framework: ${framework}.
- Aktuální otázka pro uživatele: "${currentQuestion}"
- Návod k odpovědi: ${hint}

Když uživatel odpoví na otázku, ZAVOLEJ funkci submit_answer s jeho odpovědí. Nepokračuj další otázkou bez volání submit_answer – backend ti vrátí další otázku nebo finální výstup.`;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY není nastaven. Realtime voice není k dispozici." },
      { status: 503 }
    );
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const phase = request.nextUrl.searchParams.get("phase") ?? "Iniciace";
  const framework = request.nextUrl.searchParams.get("framework") ?? "Univerzální";

  if (!projectId) {
    return NextResponse.json(
      { error: "Chybí projectId v query parametrech." },
      { status: 400 }
    );
  }

  const db = tryGetDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databáze není dostupná, nelze ověřit přístup k projektu." },
      { status: 503 }
    );
  }

  const ownership = await requireProjectOwnership(projectId, user.id, isAdmin(user));
  if (!ownership.ok) {
    if (ownership.status === 403) return forbidden();
    return NextResponse.json({ error: ownership.message }, { status: 404 });
  }

  let sdpOffer: string;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/sdp") || contentType.includes("text/plain")) {
    sdpOffer = await request.text();
  } else {
    return NextResponse.json(
      { error: "Očekáván SDP offer (Content-Type: application/sdp nebo text/plain)." },
      { status: 400 }
    );
  }

  if (!sdpOffer.trim()) {
    return NextResponse.json({ error: "Prázdný SDP offer." }, { status: 400 });
  }

  const { getQuestionsForPhase } = await import("@/lib/guide");
  const questions = getQuestionsForPhase(phase, framework as "Univerzální" | "Produktový");
  const firstQ = questions[0];
  const currentQuestion = firstQ?.text ?? "Popiš projekt.";
  const hint = firstQ?.hint ?? "Stručně popiš cíle a rozsah.";

  const instructions = buildInstructions(phase, framework, currentQuestion, hint);

  const sessionConfig = {
    type: "realtime" as const,
    model: "gpt-realtime",
    instructions,
    tools: REALTIME_TOOLS,
    tool_choice: "auto" as const,
    audio: {
      output: {
        voice: "marin" as const,
      },
    },
  };

  const fd = new FormData();
  fd.set("sdp", sdpOffer);
  fd.set("session", JSON.stringify(sessionConfig));

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: fd,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("OpenAI Realtime API error:", r.status, errText);
      return NextResponse.json(
        { error: "OpenAI Realtime API selhalo.", details: errText.slice(0, 200) },
        { status: r.status >= 500 ? 502 : r.status }
      );
    }

    const sdpAnswer = await r.text();
    return new NextResponse(sdpAnswer, {
      headers: { "Content-Type": "application/sdp" },
    });
  } catch (err) {
    console.error("Realtime session error:", err);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit Realtime session." },
      { status: 500 }
    );
  }
}
