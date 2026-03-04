/**
 * Převede Markdown na čitelný souvislý text bez symbolů (**, ###, ---, - apod.).
 * Pro export do Asany – zobrazí se jako normální text místo surového Markdownu.
 */
export function markdownToPlainText(md: string): string {
  if (!md?.trim()) return "";

  let text = md;

  // Odstranit hlavičky: ### 🟨 **Název**: Otázka → Název: Otázka
  text = text.replace(
    /^#{1,6}\s*(?:🟨\s*)?\*\*(.+?)\*\*:?\s*([^\n]*)/gm,
    (_, name, rest) => (rest.trim() ? `${name}: ${rest.trim()}\n` : `${name}\n`)
  );
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "$1\n");

  // Tučné: **text** nebo __text__ → text
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");

  // Kurzíva: *text* nebo _text_ → text (pozor na * v odrážkách)
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, "$1");

  // Horizontální čáry --- nebo *** → prázdný řádek
  text = text.replace(/^[-*_]{2,}\s*$/gm, "\n");

  // Odrážky: - item nebo * item → • item (nebo jen text na novém řádku)
  text = text.replace(/^\s*[-*]\s+(.+)$/gm, "• $1");

  // Číslované seznamy: 1. item → item
  text = text.replace(/^\s*\d+\.\s+(.+)$/gm, "• $1");

  // Zbytečné prázdné řádky zredukovat na max 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
