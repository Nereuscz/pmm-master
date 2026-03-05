import { anthropic, withRetry, env } from "./client";
import { getQuestionsForPhaseAndFramework } from "./questions";
import { SYSTEM_PROMPT } from "./prompts";

export async function generateStructuredOutput(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
  ragContext: string[];
  marketInsight?: string;
  contextNote?: string;
  uploadedContext?: string;
  asanaContext?: string;
}) {
  if (!anthropic) {
    return {
      content:
        "⚠️ ANTHROPIC_API_KEY není nastaven. Toto je fallback výstup pro lokální development bez AI."
    };
  }
  const client = anthropic;

  const questions = getQuestionsForPhaseAndFramework(input.phase, input.framework);
  const questionsList = questions.map((q) => `- **${q.name}**: ${q.hint}`).join("\n");

  const parts: string[] = [
    `**Framework:** ${input.framework}`,
    `**Fáze:** ${input.phase}`
  ];

  if (input.contextNote?.trim()) {
    parts.push(`**Poznámka průvodce k záznamu:** ${input.contextNote.trim()}`);
  }
  if (input.uploadedContext?.trim()) {
    parts.push(`**Dodatečný kontext z nahraných souborů (nahrávky, přílohy):**\n${input.uploadedContext.slice(0, 30000)}`);
  }
  if (input.projectContext?.trim()) {
    parts.push(`**Projektový kontext (z předchozích schůzek):**\n${input.projectContext}`);
  }
  if (input.asanaContext?.trim()) {
    parts.push(`**Aktuální stav v Asaně (týdenní snapshot):**\n${input.asanaContext}`);
  }
  if (input.ragContext.length > 0) {
    parts.push(
      `**Relevantní znalostní báze:**\n${input.ragContext.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    );
  }
  if (input.marketInsight?.trim()) {
    parts.push(
      `**Market Intelligence (Tavily web search – použij pro sekci 🌐 Market Insight):**\n${input.marketInsight}`
    );
  }

  parts.push(`**Otázky pro fázi ${input.phase} – ${input.framework} framework:**\n${questionsList}`);
  parts.push(`**Transkript:**\n${input.transcript}`);

  const selfCheckItems = questions.map((q) => `- ${q.name}`).join("\n");
  parts.push(
    `Vygeneruj Asana-ready výstup. Pro každou sekci použij přesné formátování:\n### 🟨 **Název sekce**: Návodná otázka\nObsah sekce...

POVINNÝ SELF-CHECK: Na konci dokumentu (těsně PŘED blokem 💡 Návrhy) vlož tento blok:
---
✔ **Kontrolní seznam sekcí:**
${selfCheckItems}
Pro každou oblast uveď: ✅ sekce zahrnuta | ❌ data v transkriptu chybí
Formát: - **Název**: ✅/❌ [1 větou proč chybí, pokud ❌]
DŮLEŽITÉ: Pokud máš oblast označenou ✅ ale sekci jsi ve výstupu nevygeneroval, DOPLŇ ji před tímto self-checkem.`
  );

  const userPrompt = parts.join("\n\n");

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  );

  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return { content: text || "AI nevrátila textový obsah." };
}

export async function generateRefinement(input: {
  existingOutput: string;
  refinementPrompt: string;
  phase: string;
  framework: string;
  projectContext: string;
  asanaContext?: string;
}): Promise<{ content: string }> {
  if (!anthropic) {
    return { content: input.existingOutput };
  }
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: `Jsi PM asistent pro JIC. Dostaneš existující PM výstup a instrukce k doladění od průvodce.

Vrať VYLEPŠENOU verzi celého výstupu:
- Zachovej sekce, které jsou v pořádku
- Doplň, přepiš nebo odstraň to, co průvodce specifikuje
- Dodržuj původní formátování (### 🟨 záhlaví, odrážky, tučný text)
- Zachovej self-check blok a sekci 💡 Návrhy na konci

Tón: přímý, lidský, analytický – jako zkušený PM kolega.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}
${input.projectContext ? `Projektový kontext: ${input.projectContext}\n` : ""}
${input.asanaContext ? `Aktuální stav v Asaně: ${input.asanaContext}\n` : ""}
Instrukce k doladění: ${input.refinementPrompt}

Stávající výstup:
${input.existingOutput}`
        }
      ]
    })
  );

  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return { content: text || input.existingOutput };
}

export async function generateProjectMemorySummary(input: {
  projectName: string;
  framework: string;
  accumulatedContext: string;
}): Promise<{ summary: string }> {
  if (!anthropic) {
    return { summary: input.accumulatedContext.slice(0, 600) };
  }
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 512,
      system: `Jsi PM asistent. Dostaneš akumulovaný kontext projektu – záznamy z různých schůzek a fází.
Vytvoř z toho JEDEN srozumitelný, souvislý odstavec (max. 4–6 vět) v češtině.
Zaměř se na: co je cílem projektu, kde projekt stojí, klíčové závěry a rozhodnutí.
Piš přirozeně, jako byste to vysvětloval kolegovi. Žádné odrážky, žádný markdown, jen čistý text.`,
      messages: [
        {
          role: "user",
          content: `Projekt: ${input.projectName} (${input.framework} framework)\n\nKontext:\n${input.accumulatedContext}`
        }
      ]
    })
  );

  const text = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  return { summary: text || input.accumulatedContext.slice(0, 600) };
}
