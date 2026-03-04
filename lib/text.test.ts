import { describe, it, expect } from "vitest";
import {
  tokenize,
  uniqueTokens,
  chunkText,
  scoreRelevance,
  summarizeForContext,
  detectChangeSignals,
  extractContextSummary,
  buildContextBlock,
  mergeContextBlocks,
} from "./text";

describe("tokenize", () => {
  it("returns lowercase tokens longer than 2 chars", () => {
    expect(tokenize("Projekt PM Assistant")).toEqual(["projekt", "assistant"]);
  });

  it("filters short tokens", () => {
    expect(tokenize("a b c d")).toEqual([]);
  });

  it("handles unicode", () => {
    expect(tokenize("Český text")).toContain("český");
  });
});

describe("uniqueTokens", () => {
  it("returns unique tokens", () => {
    const tokens = uniqueTokens("projekt projekt nový");
    expect(tokens.size).toBe(2);
    expect(tokens.has("projekt")).toBe(true);
    expect(tokens.has("nový")).toBe(true);
  });
});

describe("chunkText", () => {
  it("returns empty for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk when text is short", () => {
    const result = chunkText("Krátký text");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Krátký text");
  });

  it("splits long text with overlap", () => {
    const long = "a".repeat(2500);
    const chunks = chunkText(long, 1000, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBe(1000);
    // Overlap: next chunk should start before end of previous
    const overlap = chunks[0].slice(-100);
    expect(chunks[1].startsWith(overlap)).toBe(true);
  });
});

describe("scoreRelevance", () => {
  it("returns 0 for empty query or content", () => {
    expect(scoreRelevance("", "nějaký obsah")).toBe(0);
    expect(scoreRelevance("dotaz", "")).toBe(0);
  });

  it("returns higher score for more overlap", () => {
    const low = scoreRelevance("projekt", "úplně jiný text");
    const high = scoreRelevance("projekt management", "projekt management dokumentace");
    expect(high).toBeGreaterThan(low);
  });
});

describe("summarizeForContext", () => {
  it("returns input when under maxChars", () => {
    const text = "Krátký text";
    expect(summarizeForContext(text, 100)).toBe(text);
  });

  it("truncates with ellipsis when over maxChars", () => {
    const text = "a".repeat(150);
    const result = summarizeForContext(text, 100);
    expect(result.length).toBe(100);
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("extractContextSummary", () => {
  const sampleOutput = `### 🟨 **Problém/Potřeba**: Jaký problém řeší?

Firmy nemají přístup k mentorům v regionu.

### 🟨 **Hodnota produktu (Value Proposition)**: Jakou hodnotu vytváří?

Propojujeme startupy s mentory z korporátního sektoru.

*PM Kontext: Přechod z dřívějšího programu XY.*

---
💡 **Návrhy na zlepšení instrukcí:**
- Doplnit sekci Rizika`;

  it("extracts section names and content", () => {
    const result = extractContextSummary(sampleOutput);
    expect(result).toContain("Problém/Potřeba:");
    expect(result).toContain("Hodnota produktu (Value Proposition):");
  });

  it("excludes the Návrhy meta-section", () => {
    const result = extractContextSummary(sampleOutput);
    expect(result).not.toContain("Návrhy");
  });

  it("excludes PM Kontext lines", () => {
    const result = extractContextSummary(sampleOutput);
    expect(result).not.toContain("PM Kontext");
  });

  it("returns empty string for empty input", () => {
    expect(extractContextSummary("")).toBe("");
  });
});

describe("buildContextBlock", () => {
  it("includes phase and short date in header", () => {
    const block = buildContextBlock("Iniciace", "2026-03-04T10:00:00.000Z", "summary text");
    expect(block).toContain("--- Fáze: Iniciace | 2026-03-04 ---");
    expect(block).toContain("summary text");
  });
});

describe("mergeContextBlocks", () => {
  it("appends a new phase block to empty context", () => {
    const block = buildContextBlock("Iniciace", "2026-01-01T00:00:00Z", "content A");
    const result = mergeContextBlocks("", block, "Iniciace");
    expect(result).toContain("Fáze: Iniciace");
    expect(result).toContain("content A");
  });

  it("replaces existing block for the same phase (deduplication)", () => {
    const first = buildContextBlock("Iniciace", "2026-01-01T00:00:00Z", "old content");
    const second = buildContextBlock("Iniciace", "2026-02-01T00:00:00Z", "new content");
    const after1 = mergeContextBlocks("", first, "Iniciace");
    const after2 = mergeContextBlocks(after1, second, "Iniciace");
    expect(after2).toContain("new content");
    expect(after2).not.toContain("old content");
    // Only one Iniciace block
    expect((after2.match(/--- Fáze: Iniciace/g) ?? []).length).toBe(1);
  });

  it("keeps blocks for different phases", () => {
    const b1 = buildContextBlock("Iniciace", "2026-01-01T00:00:00Z", "iniciace content");
    const b2 = buildContextBlock("Plánování", "2026-02-01T00:00:00Z", "planovani content");
    const after1 = mergeContextBlocks("", b1, "Iniciace");
    const after2 = mergeContextBlocks(after1, b2, "Plánování");
    expect(after2).toContain("iniciace content");
    expect(after2).toContain("planovani content");
  });

  it("drops oldest blocks when over maxChars", () => {
    const old = buildContextBlock("Iniciace", "2026-01-01T00:00:00Z", "a".repeat(300));
    const recent = buildContextBlock("Plánování", "2026-02-01T00:00:00Z", "b".repeat(300));
    const after1 = mergeContextBlocks("", old, "Iniciace");
    // Set tiny limit to force eviction of the oldest block
    const after2 = mergeContextBlocks(after1, recent, "Plánování", 400);
    expect(after2).toContain("bbb");
    expect(after2).not.toContain("aaa");
  });

  it("discards legacy plain-text context and starts fresh", () => {
    const legacy = "Datum: 2026-01-01\nFáze: Iniciace\nShrnutí: starý výstup...";
    const newBlock = buildContextBlock("Iniciace", "2026-03-01T00:00:00Z", "nový obsah");
    const result = mergeContextBlocks(legacy, newBlock, "Iniciace");
    expect(result).not.toContain("starý výstup");
    expect(result).toContain("nový obsah");
  });
});

describe("detectChangeSignals", () => {
  it("returns empty for empty previous", () => {
    expect(detectChangeSignals("", "nový transkript")).toEqual([]);
  });

  it("returns signal when new tokens in transcript", () => {
    const result = detectChangeSignals("starý obsah", "starý obsah nové téma");
    expect(result.length).toBe(1);
    expect(result[0]).toContain("nové");
    expect(result[0]).toContain("téma");
  });
});
