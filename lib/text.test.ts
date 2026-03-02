import { describe, it, expect } from "vitest";
import {
  tokenize,
  uniqueTokens,
  chunkText,
  scoreRelevance,
  summarizeForContext,
  detectChangeSignals,
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
