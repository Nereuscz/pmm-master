import { describe, it, expect } from "vitest";
import {
  processTranscriptSchema,
  createProjectSchema,
  kbSearchSchema,
} from "./schemas";

describe("processTranscriptSchema", () => {
  it("accepts valid input", () => {
    const result = processTranscriptSchema.safeParse({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      phase: "Iniciace",
      framework: "Univerzální",
      transcript: "a".repeat(300),
    });
    expect(result.success).toBe(true);
  });

  it("rejects transcript under 300 chars", () => {
    const result = processTranscriptSchema.safeParse({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      phase: "Iniciace",
      framework: "Univerzální",
      transcript: "krátký",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phase", () => {
    const result = processTranscriptSchema.safeParse({
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      phase: "Neplatná",
      framework: "Univerzální",
      transcript: "a".repeat(300),
    });
    expect(result.success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts valid input", () => {
    const result = createProjectSchema.safeParse({
      name: "Můj projekt",
      framework: "Produktový",
      phase: "Plánování",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name under 3 chars", () => {
    const result = createProjectSchema.safeParse({
      name: "ab",
      framework: "Univerzální",
      phase: "Iniciace",
    });
    expect(result.success).toBe(false);
  });
});

describe("kbSearchSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = kbSearchSchema.safeParse({ query: "projekt" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(8);
    }
  });

  it("rejects query under 3 chars", () => {
    const result = kbSearchSchema.safeParse({ query: "ab" });
    expect(result.success).toBe(false);
  });
});
