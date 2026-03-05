import { NextRequest, NextResponse } from "next/server";
import { parseFileBuffer, detectMimeType, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/parser";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Parse document (PDF, DOCX, TXT, MD) and return extracted text.
 * Used by guide for attachment uploads – same logic as /api/kb/upload-parse.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const rateLimit = await checkAiRateLimit(`ai:${user.id}`);
  if (!rateLimit.success) return rateLimit.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nepodařilo se číst formulář." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chybí soubor." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Soubor je příliš velký (max 20 MB)." }, { status: 413 });
  }

  const mimeType = detectMimeType(file.name);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Nepodporovaný formát. Povoleno: PDF, DOCX, DOC, TXT, MD." },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseFileBuffer(buffer, mimeType);
    return NextResponse.json({ text: text ?? "" });
  } catch (err) {
    logApiError("/api/guide/parse-attachment", err);
    const msg = err instanceof Error ? err.message : "Chyba parsování";
    return NextResponse.json({ error: `Nepodařilo se extrahovat text: ${msg}` }, { status: 422 });
  }
}
