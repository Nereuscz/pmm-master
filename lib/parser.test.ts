import { describe, it, expect } from "vitest";
import {
  detectMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  parseFileBuffer,
} from "./parser";

describe("detectMimeType", () => {
  it("detects PDF", () => {
    expect(detectMimeType("doc.pdf")).toBe("application/pdf");
    expect(detectMimeType("file.PDF")).toBe("application/pdf");
  });

  it("detects DOCX and DOC", () => {
    expect(detectMimeType("doc.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(detectMimeType("doc.doc")).toBe("application/msword");
  });

  it("detects TXT and MD", () => {
    expect(detectMimeType("readme.txt")).toBe("text/plain");
    expect(detectMimeType("readme.md")).toBe("text/markdown");
  });

  it("returns octet-stream for unknown", () => {
    expect(detectMimeType("file.xyz")).toBe("application/octet-stream");
  });
});

describe("ALLOWED_MIME_TYPES", () => {
  it("includes expected types", () => {
    expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("text/plain")).toBe(true);
    expect(ALLOWED_MIME_TYPES.has("text/markdown")).toBe(true);
  });
});

describe("MAX_FILE_SIZE_BYTES", () => {
  it("is 20 MB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
  });
});

describe("parseFileBuffer", () => {
  it("parses text/plain", async () => {
    const buf = Buffer.from("Hello world", "utf-8");
    const text = await parseFileBuffer(buf, "text/plain");
    expect(text).toBe("Hello world");
  });

  it("parses text/markdown", async () => {
    const buf = Buffer.from("# Nadpis\nObsah", "utf-8");
    const text = await parseFileBuffer(buf, "text/markdown");
    expect(text).toBe("# Nadpis\nObsah");
  });

  it("throws for unsupported mime type", async () => {
    await expect(
      parseFileBuffer(Buffer.from("xxxx"), "application/octet-stream")
    ).rejects.toThrow("Nepodporovaný formát");
  });
});
