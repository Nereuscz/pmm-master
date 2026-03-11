const WORD_RE = /[\p{L}\p{N}_-]+/gu;

export function tokenize(input: string): string[] {
  return (input.toLowerCase().match(WORD_RE) ?? []).filter((token) => token.length > 2);
}

export function uniqueTokens(input: string): Set<string> {
  return new Set(tokenize(input));
}

export function chunkText(input: string, maxChars = 1200, overlap = 160): string[] {
  const text = input.trim();
  if (!text) {
    return [];
  }

  // Guard against infinite loop when overlap >= maxChars
  const safeOverlap = overlap >= maxChars ? Math.floor(maxChars / 4) : overlap;

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) {
      break;
    }
    start = end - safeOverlap;
  }
  return chunks;
}

export function scoreRelevance(query: string, content: string): number {
  const q = uniqueTokens(query);
  const c = uniqueTokens(content);
  if (q.size === 0 || c.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of q) {
    if (c.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.sqrt(q.size * c.size);
}

export function summarizeForContext(input: string, maxChars = 1200): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars - 3)}...`;
}

// ─── Project context helpers ───────────────────────────────────────────────────

const PHASE_BLOCK_MARKER = "--- Fáze:";

/**
 * Extracts a compact per-section summary from a structured AI markdown output.
 * Captures section names + first ~150 chars of prose per section.
 * Excludes the trailing "💡 Návrhy" meta-section and PM Kontext lines.
 */
export function extractContextSummary(aiOutput: string, maxCharsPerSection = 150): string {
  // Drop the trailing "Návrhy na zlepšení" meta-block
  const withoutMeta = aiOutput.split(/\n---\n💡\s*\*\*Návrhy/)[0];

  const lines = withoutMeta.split("\n");
  const summaries: string[] = [];
  let currentName = "";
  let currentContent: string[] = [];

  function flush() {
    if (!currentName) return;
    const text = currentContent
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .trim()
      .slice(0, maxCharsPerSection);
    if (text) summaries.push(`${currentName}: ${text}`);
    currentContent = [];
  }

  for (const line of lines) {
    // Match ### 🟨 **SectionName**: ... or ## SectionName
    const heading = line.match(/^#{2,3}\s+.*?\*\*([^*:]+)\*\*/);
    if (heading) {
      flush();
      currentName = heading[1].trim();
    } else if (
      currentName &&
      line.trim() &&
      !line.startsWith("#") &&
      !line.trimStart().startsWith("*PM Kontext")
    ) {
      if (currentContent.join(" ").length < maxCharsPerSection * 2) {
        currentContent.push(line.trim());
      }
    }
  }
  flush();

  return summaries.join("\n");
}

/**
 * Builds a delimited context block for a single phase entry.
 */
export function buildContextBlock(phase: string, isoDate: string, summary: string): string {
  const dateShort = isoDate.slice(0, 10);
  return `${PHASE_BLOCK_MARKER} ${phase} | ${dateShort} ---\n${summary}`;
}

/**
 * Merges a new phase block into the accumulated context with three improvements
 * over the old approach:
 *  1. Phase deduplication – replaces an existing entry for the same phase
 *     instead of appending a duplicate.
 *  2. Oldest-first truncation – when over maxChars, drops the oldest blocks
 *     (not the newest).
 *  3. Legacy detection – if the existing context uses the old plain-text format
 *     (no structured blocks), it is silently discarded so the new format starts
 *     cleanly.
 */
export function mergeContextBlocks(
  existingContext: string,
  newBlock: string,
  phase: string,
  maxChars = 8000
): string {
  const isLegacy =
    existingContext.trim().length > 0 && !existingContext.includes(PHASE_BLOCK_MARKER);
  const base = isLegacy ? "" : existingContext;

  const blocks = base
    .split(/(?=^--- Fáze:)/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const phasePrefix = `${PHASE_BLOCK_MARKER} ${phase}`;
  const idx = blocks.findIndex((b) => b.startsWith(phasePrefix));
  if (idx >= 0) {
    blocks[idx] = newBlock;
  } else {
    blocks.push(newBlock);
  }

  // Drop oldest first until within limit
  let result = blocks.join("\n\n");
  while (result.length > maxChars && blocks.length > 1) {
    blocks.shift();
    result = blocks.join("\n\n");
  }

  // Last-resort hard truncate keeping the tail (most recent content)
  if (result.length > maxChars) {
    result = result.slice(-maxChars);
  }

  return result;
}

export function detectChangeSignals(previousOutput: string, transcript: string): string[] {
  if (!previousOutput.trim()) {
    return [];
  }
  const prev = uniqueTokens(previousOutput);
  const curr = uniqueTokens(transcript);
  const newTokens: string[] = [];
  for (const token of curr) {
    if (!prev.has(token)) {
      newTokens.push(token);
    }
    if (newTokens.length >= 12) {
      break;
    }
  }

  if (newTokens.length === 0) {
    return [];
  }
  return [`Nová témata oproti minulé session: ${newTokens.join(", ")}`];
}
