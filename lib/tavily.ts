import { env } from "./env";

// ─── Typy ──────────────────────────────────────────────────────────────────────

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

type TavilyResponse = {
  results: TavilyResult[];
  answer?: string;
};

// ─── Vyhledávání na webu via Tavily ────────────────────────────────────────────

/**
 * Prohledá web přes Tavily API a vrátí formátovaný přehled podobných produktů/projektů.
 * Vrátí prázdný řetězec pokud chybí API klíč nebo search selže.
 */
export async function searchMarket(query: string): Promise<string> {
  if (!env.TAVILY_API_KEY) return "";
  if (!query.trim()) return "";

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query: `${query} – similar products competitors alternatives`,
        search_depth: "basic",
        include_answer: true,
        max_results: 5,
        include_raw_content: false
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) return "";

    const data: TavilyResponse = await response.json();
    if (!data.results || data.results.length === 0) return "";

    const parts: string[] = [];

    if (data.answer?.trim()) {
      parts.push(`**Přehled trhu:** ${data.answer.trim()}`);
    }

    const topResults = data.results
      .filter((r) => r.score > 0.3)
      .slice(0, 5);

    if (topResults.length > 0) {
      parts.push(
        "**Nalezené podobné produkty/projekty/iniciativy:**\n" +
          topResults
            .map((r, i) => {
              const snippet = r.content.slice(0, 250).trim();
              const domain = (() => {
                try {
                  return new URL(r.url).hostname.replace("www.", "");
                } catch {
                  return r.url;
                }
              })();
              return `${i + 1}. **${r.title}** (${domain})\n   ${snippet}`;
            })
            .join("\n\n")
      );
    }

    return parts.join("\n\n");
  } catch {
    // Tavily je neblokující enrichment – chyba nesmí zablokovat hlavní zpracování
    return "";
  }
}

// ─── Extrakce search query ─────────────────────────────────────────────────────

/**
 * Vytvoří stručný search query z pole odpovědí průvodce.
 * Hledá nejdříve "Předmět" / "Problém" / "Hodnota produktu" jako nejrelevantnější odpovědi.
 */
export function buildQueryFromAnswers(
  answers: Array<{ question: string; answer: string }>
): string {
  if (answers.length === 0) return "";

  const priority = ["Předmět", "Problém", "Hodnota", "Positioning", "Cíl"];
  const best = priority
    .map((keyword) =>
      answers.find((a) => a.question.toLowerCase().includes(keyword.toLowerCase()))
    )
    .find(Boolean);

  const chosen = best ?? answers[0];
  return chosen.answer.trim().slice(0, 200);
}

/**
 * Vytvoří stručný search query z transkriptu schůzky.
 * Vezme první větu / odstavec jako nejrelevantnější kontext.
 */
export function buildQueryFromTranscript(transcript: string): string {
  // Vezmi první 2 odstavce nebo max. 300 znaků
  const lines = transcript.trim().split(/\n+/).filter(Boolean);
  const snippet = lines.slice(0, 3).join(" ").replace(/\s+/g, " ");
  return snippet.slice(0, 300);
}
