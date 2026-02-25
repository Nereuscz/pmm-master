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

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) {
      break;
    }
    start = Math.max(0, end - overlap);
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
