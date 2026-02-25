import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

export const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

export async function generateStructuredOutput(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
  ragContext: string[];
}) {
  if (!anthropic) {
    return {
      content:
        "ANTHROPIC_API_KEY není nastaven. Toto je fallback výstup pro lokální development."
    };
  }

  const systemPrompt =
    "Jsi PM Assistant pro JIC. Vracej strukturovaný výstup vhodný pro Asana tasky a subtasky.";

  const userPrompt = [
    `Fáze: ${input.phase}`,
    `Framework: ${input.framework}`,
    `Projektový kontext: ${input.projectContext || "N/A"}`,
    `Relevantní znalostní kontext:`,
    input.ragContext.map((item, idx) => `${idx + 1}. ${item}`).join("\n"),
    `Transkript:`,
    input.transcript
  ].join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 1600,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }]
  });

  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return { content: text || "AI nevrátila textový obsah." };
}
