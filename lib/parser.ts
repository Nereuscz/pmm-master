import mammoth from "mammoth";

export type ParseResult = {
  text: string;
  mimeType: string;
};

/** Magic bytes validation – prevents bypass via renamed files (e.g. .exe → .pdf). Spec §10.5 */
function validateMagicBytes(buffer: Buffer, mimeType: string): void {
  if (buffer.length < 4) {
    throw new Error("Soubor je příliš malý pro validaci.");
  }
  const pdfMagic = Buffer.from("%PDF", "ascii");
  const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
  const zipMagic2 = Buffer.from([0x50, 0x4b, 0x05, 0x06]); // PK.. (empty zip)
  const oleMagic = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // DOC binary

  if (mimeType === "application/pdf") {
    if (!buffer.subarray(0, 4).equals(pdfMagic)) {
      throw new Error("Soubor není platný PDF (neplatné magic bytes).");
    }
  } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const header = buffer.subarray(0, 4);
    if (!header.equals(zipMagic) && !header.equals(zipMagic2)) {
      throw new Error("Soubor není platný DOCX (očekáván ZIP formát).");
    }
  } else if (mimeType === "application/msword") {
    const header = buffer.subarray(0, 4);
    if (!header.equals(oleMagic)) {
      throw new Error("Soubor není platný DOC (očekáván OLE formát).");
    }
  }
  // text/plain, text/markdown: no reliable magic bytes, rely on extension
}

export async function parseFileBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  validateMagicBytes(buffer, mimeType);
  if (mimeType === "application/pdf") {
    // Lazy require inside the function – prevents Next.js from bundling pdf-parse
    // into the edge/browser bundle. Must stay here, not at module level.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
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
