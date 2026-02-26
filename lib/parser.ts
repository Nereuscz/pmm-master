import mammoth from "mammoth";
// pdf-parse 1.x exports a plain function (CommonJS)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export type ParseResult = {
  text: string;
  mimeType: string;
};

export async function parseFileBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Nepodporovaný formát souboru: ${mimeType}`);
}

export function detectMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    txt: "text/plain",
    md: "text/markdown",
  };
  return map[ext] ?? "application/octet-stream";
}

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
]);

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
