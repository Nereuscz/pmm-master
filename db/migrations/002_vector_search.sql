-- Migration 002: Vector similarity search for RAG
-- Run this in Supabase SQL editor after schema.sql and 001_v12_upgrade.sql

-- 1. IVFFLAT index pro rychlé cosine similarity vyhledávání
--    lists=50 je vhodné pro ~1 000 chunků; pro více zvedni na sqrt(count)
--    POZOR: index nelze vytvořit nad prázdnou tabulkou – spusť až po prvním uploadu dokumentu
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
  ON kb_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- 2. RPC funkce pro sémantické vyhledávání (volána přes supabase.rpc())
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 8
)
RETURNS TABLE(id uuid, content text, similarity float)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM kb_chunks c
  INNER JOIN kb_documents d ON c.document_id = d.id
  WHERE
    d.deleted_at IS NULL
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
