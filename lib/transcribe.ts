import fs from "fs";
import path from "path";
import os from "os";
import OpenAI from "openai";

const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
]);

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const openai = getClient();
  if (!openai) throw new Error("OPENAI_API_KEY není nastaven.");

  if (buffer.length > WHISPER_MAX_BYTES) {
    throw new Error("Audio soubor je příliš velký (max 25 MB).");
  }

  const ext = path.extname(filename) || ".mp3";
  const tmpPath = path.join(os.tmpdir(), `whisper-${Date.now()}${ext}`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const stream = fs.createReadStream(tmpPath);
    const response = await openai.audio.transcriptions.create({
      file: stream,
      model: "whisper-1",
      language: "cs",
    });
    return response.text ?? "";
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export function isAudioMimeType(mime: string): boolean {
  return AUDIO_MIME_TYPES.has(mime) || mime.startsWith("audio/");
}

export function getAudioMimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    webm: "audio/webm",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    ogg: "audio/ogg",
  };
  return map[ext] ?? "audio/mpeg";
}
