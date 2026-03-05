-- Projektová vrstva KB: project_id + visibility='project'

ALTER TABLE kb_documents
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Rozšíření visibility check o 'project' hodnotu
ALTER TABLE kb_documents DROP CONSTRAINT IF EXISTS kb_documents_visibility_check;
ALTER TABLE kb_documents
  ADD CONSTRAINT kb_documents_visibility_check
  CHECK (visibility IN ('global', 'team', 'project'));

-- Index pro rychlé filtrování per-project dokumentů
CREATE INDEX IF NOT EXISTS idx_kb_documents_project_id
  ON kb_documents(project_id) WHERE project_id IS NOT NULL;

-- RPC pro vector search s volitelným project_id filtrem
-- Vrací globální/team chunky + chunky specifické pro daný projekt
CREATE OR REPLACE FUNCTION match_kb_chunks_for_project(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM kb_chunks kc
  JOIN kb_documents kd ON kd.id = kc.document_id
  WHERE kd.deleted_at IS NULL
    AND (
      kd.visibility IN ('global', 'team')
      OR (kd.visibility = 'project' AND kd.project_id = p_project_id)
    )
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
