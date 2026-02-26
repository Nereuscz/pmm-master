import { ensureDb } from "./db";
import { chunkText } from "./text";
import { generateEmbedding } from "./embeddings";

export async function upsertDocumentWithChunks(input: {
  documentId?: string;
  title: string;
  category: string;
  source: "upload" | "sharepoint";
  content: string;
  sharepointId?: string;
  uploadedBy?: string;
  visibility: "global" | "team";
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
}) {
  const db = ensureDb();
  const now = new Date().toISOString();

  let documentId = input.documentId;
  if (!documentId) {
    const { data, error } = await db
      .from("kb_documents")
      .insert({
        title: input.title,
        category: input.category,
        source: input.source,
        sharepoint_id: input.sharepointId ?? null,
        uploaded_by: input.uploadedBy ?? null,
        source_text: input.content,
        visibility: input.visibility,
        file_path: input.filePath ?? null,
        file_size: input.fileSize ?? null,
        mime_type: input.mimeType ?? null,
        created_at: now
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Nepodařilo se vytvořit KB dokument. ${error?.message ?? ""}`.trim());
    }
    documentId = data.id;
  } else {
    const { error } = await db
      .from("kb_documents")
      .update({
        title: input.title,
        category: input.category,
        source_text: input.content,
        sharepoint_id: input.sharepointId ?? null,
        visibility: input.visibility
      })
      .eq("id", documentId);
    if (error) {
      throw new Error(`Nepodařilo se aktualizovat KB dokument. ${error.message}`);
    }
    await db.from("kb_chunks").delete().eq("document_id", documentId);
  }

  const chunks = chunkText(input.content, 1200, 180);
  if (chunks.length > 0) {
    const rows = await Promise.all(
      chunks.map(async (content, index) => {
        const embedding = await generateEmbedding(content);
        return {
          document_id: documentId,
          content,
          embedding,
          chunk_index: index,
          metadata: { title: input.title, category: input.category }
        };
      })
    );
    const { error: chunkError } = await db.from("kb_chunks").insert(rows);
    if (chunkError) {
      throw new Error(`Nepodařilo se uložit chunky. ${chunkError.message}`);
    }
  }

  return { documentId, chunksCount: chunks.length };
}
