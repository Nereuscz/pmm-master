/**
 * Parser pro AI výstup PM dokumentace.
 * Formát dle anthropic promptu: ### 🟨 **Název sekce**: Návodná otázka
 */

export type PmOutputSection = { question: string; answer: string };

/** Hlavička sekce: ### 🟨 **Název**: Otázka nebo ### 🟨 **Název** (bez \s* aby se nezachytil obsah dalšího řádku) */
const SECTION_HEADER = /^###[ \t]*(?:🟨[ \t]*)?\*\*(.+?)\*\*:?[ \t]*([^\n]*)/gm;

/** Zastavíme parsování u meta bloků (self-check, návrhy). */
const META_STOP = /\n(---\s*\n|✔\s*\*\*|💡\s*\*\*)/;

/**
 * Rozparsuje AI výstup na sekce pro Asana export.
 * Každá sekce → jeden subtask (question = název, answer = obsah).
 * Pokud nelze rozparsovat, vrací jednu sekci s celým obsahem.
 */
export function parsePmOutputIntoSections(output: string): PmOutputSection[] {
  const trimmed = output.trim();
  if (!trimmed) return [];

  const metaStopMatch = trimmed.match(META_STOP);
  const contentBoundary = metaStopMatch ? metaStopMatch.index! : trimmed.length;
  const contentArea = trimmed.slice(0, contentBoundary);

  const sections: PmOutputSection[] = [];
  const headerRegex = new RegExp(SECTION_HEADER.source, "gm");
  let match: RegExpExecArray | null;

  const headers: { question: string; start: number; headerEnd: number }[] = [];

  while ((match = headerRegex.exec(contentArea)) !== null) {
    const name = match[1].trim();
    const questionPart = (match[2] || "").trim();
    const question = questionPart ? `${name}: ${questionPart}` : name;
    headers.push({
      question,
      start: match.index,
      headerEnd: match.index + match[0].length,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const curr = headers[i];
    const next = headers[i + 1];
    const contentStart = curr.headerEnd;
    const contentEnd = next ? next.start : contentArea.length;
    let content = contentArea.slice(contentStart, contentEnd).trim();
    content = content.replace(/^\n+/g, "").trim();
    if (content.length > 0) {
      sections.push({ question: curr.question, answer: content });
    }
  }

  if (sections.length === 0) {
    return [{ question: "PM dokumentace", answer: trimmed }];
  }

  return sections;
}
