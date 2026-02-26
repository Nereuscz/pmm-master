import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { upsertDocumentWithChunks } from "@/lib/kb";
import { parseFileBuffer, detectMimeType, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/parser";
import { getAuthUser, unauthorized, canManageKb, forbidden } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canManageKb(user)) return forbidden();

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Storage není dostupný." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Nepodařilo se číst formulář." }, { status: 400 });
  }

  const file = formData.get("file");
  const title = formData.get("title")?.toString().trim();
  const category = formData.get("category")?.toString().trim() ?? "general";
  const visibility = (formData.get("visibility")?.toString() ?? "global") as "global" | "team";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chybí soubor." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Chybí název dokumentu." }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: `Soubor je příliš velký (max 20 MB).` }, { status: 413 });
  }

  // Detect & validate MIME
  const mimeType = detectMimeType(file.name);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Nepodporovaný formát. Povoleno: PDF, DOCX, DOC, TXT, MD." },
      { status: 415 }
    );
  }

  // Parse text from file
  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText: string;
  try {
    extractedText = await parseFileBuffer(buffer, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chyba parsování";
    return NextResponse.json({ error: `Nepodařilo se extrahovat text: ${msg}` }, { status: 422 });
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: "Soubor neobsahuje žádný čitelný text." }, { status: 422 });
  }

  // Upload raw file to Supabase Storage
  const storagePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("kb-documents")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    // Non-fatal: continue without storage path
  }

  // Upsert document + chunks with embeddings
  try {
    const result = await upsertDocumentWithChunks({
      title,
      category,
      source: "upload",
      content: extractedText,
      uploadedBy: user.id,
      visibility,
      filePath: uploadError ? undefined : storagePath,
      fileSize: file.size,
      mimeType
    });

    return NextResponse.json(
      { ...result, filename: file.name, extractedLength: extractedText.length },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
