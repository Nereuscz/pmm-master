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
 *
 * @param query - sestavený search dotaz
 * @param framework - "Produktový" nebo "Univerzální"; ovlivňuje suffix dotazu
 */
export async function searchMarket(
  query: string,
  framework: "Produktový" | "Univerzální" = "Produktový"
): Promise<string> {
  if (!env.TAVILY_API_KEY) return "";
  if (!query.trim()) return "";

  // Suffix odpovídá kontextu: produkty hledají tržní srovnatele,
  // univerzální projekty hledají best practices a implementační vzory.
  const suffix =
    framework === "Produktový"
      ? "innovation program product market fit competitive landscape"
      : "best practices implementation case studies innovation ecosystem";

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TAVILY_API_KEY,
        query: `${query} ${suffix}`,
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

    // Vyšší práh skóre = relevantnější výsledky, méně šumu
    const topResults = data.results
      .filter((r) => r.score > 0.4)
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
 * Vytvoří search query z odpovědí průvodce kombinací více klíčových odpovědí.
 * Místo jedné odpovědi spojuje Problém + Hodnotu + Cílovku pro bohatší kontext.
 */
export function buildQueryFromAnswers(
  answers: Array<{ question: string; answer: string }>
): string {
  if (answers.length === 0) return "";

  // Extrahuj hodnoty pro každou klíčovou dimenzi (první shoda)
  const pick = (keywords: string[]) =>
    answers.find((a) =>
      keywords.some((kw) => a.question.toLowerCase().includes(kw.toLowerCase()))
    )?.answer.trim() ?? "";

  const problem = pick(["Problém", "Potřeba", "Předmět"]);
  const value = pick(["Hodnota", "Value Proposition", "Positioning"]);
  const audience = pick(["Cílovka", "cílová skupina", "Zákazník"]);

  // Zkombinuj dostupné části do jednoho dotazu
  const parts = [problem, value, audience]
    .filter(Boolean)
    .map((s) => s.slice(0, 120));

  if (parts.length === 0) {
    // Fallback: první odpověď
    return answers[0].answer.trim().slice(0, 300);
  }

  return parts.join(". ").slice(0, 400);
}

/**
 * Vytvoří search query z transkriptu schůzky.
 * Přeskakuje krátké úvodní řádky (metadata, přivítání) a hledá věcný obsah.
 */
export function buildQueryFromTranscript(transcript: string): string {
  const lines = transcript.trim().split(/\n+/).filter(Boolean);

  // Přeskoč řádky kratší než 40 znaků – pravděpodobně metadata nebo pozdravy
  const meaningful = lines.filter((l) => l.trim().length >= 40);
  const source = meaningful.length > 0 ? meaningful : lines;

  // Vezmi první 3 věcné řádky
  const snippet = source.slice(0, 3).join(" ").replace(/\s+/g, " ");
  return snippet.slice(0, 400);
}
