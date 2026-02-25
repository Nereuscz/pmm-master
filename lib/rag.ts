import { supabaseAdmin } from "./supabase-admin";
import { scoreRelevance } from "./text";
import { generateEmbedding } from "./embeddings";

type RagChunk = {
  id: string;
  content: string;
  score: number;
};

/**
 * Retrieves the most relevant KB chunks for a given query.
 *
 * Strategy:
 *  1. Try vector similarity via pgvector (requires OPENAI_API_KEY + embeddings in DB).
 *  2. Fall back to lexical token scoring when embeddings are unavailable.
 */
export async function retrieveTopChunks(input: {
  projectId: string;
  queryText: string;
  limit?: number;
}): Promise<RagChunk[]> {
  const limit = input.limit ?? 5;

  if (!supabaseAdmin) {
    return [];
  }

  const embedding = await generateEmbedding(input.queryText);

  if (embedding) {
    const { data, error } = await supabaseAdmin.rpc("match_kb_chunks", {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: limit
    });

    if (!error && data && data.length > 0) {
      return (data as Array<{ id: string; content: string; similarity: number }>).map((row) => ({
        id: row.id,
        content: row.content,
        score: row.similarity
      }));
    }
  }

  // Lexical fallback: used when OPENAI_API_KEY is absent or embeddings not yet populated
  const { data, error } = await supabaseAdmin
    .from("kb_chunks")
    .select("id,content,document_id,kb_documents!inner(deleted_at)")
    .is("kb_documents.deleted_at", null)
    .limit(800);

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const content = String(row.content);
      return {
        id: String(row.id),
        content,
        score: scoreRelevance(input.queryText, content)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
