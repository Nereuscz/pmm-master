import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, isAudioMimeType, getAudioMimeFromFilename } from "@/lib/transcribe";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { logApiError } from "@/lib/api-logger";
import { checkAiRateLimit } from "@/lib/rate-limit";

const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "Chybí audio soubor." }, { status: 400 });
  }

  if (file.size > WHISPER_MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio soubor je příliš velký (max 25 MB)." },
      { status: 413 }
    );
  }

  const mimeType = file.type || getAudioMimeFromFilename(file.name);
  if (!isAudioMimeType(mimeType)) {
    return NextResponse.json(
      { error: "Nepodporovaný formát. Povoleno: MP3, WAV, M4A, WebM, MP4, OGG." },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeAudio(buffer, file.name);
    return NextResponse.json({ text: text ?? "" });
  } catch (err) {
    logApiError("/api/guide/transcribe", err);
    const msg = err instanceof Error ? err.message : "Chyba přepisu";
    return NextResponse.json({ error: `Nepodařilo se přepsat audio: ${msg}` }, { status: 422 });
  }
}
