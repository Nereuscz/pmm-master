-- PM Assistant – diagnostika Supabase
-- Spusť v Supabase Dashboard → SQL Editor
-- Zobrazí co už existuje a co chybí

-- ═══════════════════════════════════════════════════════════════════
-- 1. ROZŠÍŘENÍ
-- ═══════════════════════════════════════════════════════════════════
SELECT 'vector' AS polozka, CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN '✓ OK' ELSE '✗ CHYBÍ' END AS stav
UNION ALL
SELECT 'pgcrypto', CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN '✓ OK' ELSE '✗ CHYBÍ' END;

-- ═══════════════════════════════════════════════════════════════════
-- 2. TABULKY
-- ═══════════════════════════════════════════════════════════════════
WITH expected(tbl) AS (
  SELECT unnest(ARRAY['users','projects','project_context','sessions','kb_documents','kb_chunks','kb_sync_log','processing_jobs','export_jobs','audit_log'])
)
SELECT e.tbl AS polozka,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ OK' ELSE '✗ CHYBÍ' END AS stav
FROM expected e
LEFT JOIN information_schema.tables t ON t.table_schema = 'public' AND t.table_name = e.tbl
ORDER BY e.tbl;

-- ═══════════════════════════════════════════════════════════════════
-- 3. SLOUPCE kb_documents (migrace 003)
-- ═══════════════════════════════════════════════════════════════════
WITH expected(col) AS (
  SELECT unnest(ARRAY['file_path','file_size','mime_type'])
)
SELECT e.col AS polozka,
  CASE WHEN c.column_name IS NOT NULL THEN '✓ OK' ELSE '✗ CHYBÍ' END AS stav
FROM expected e
LEFT JOIN information_schema.columns c ON c.table_schema='public' AND c.table_name='kb_documents' AND c.column_name=e.col
ORDER BY e.col;

-- ═══════════════════════════════════════════════════════════════════
-- 4. INDEX + FUNKCE (migrace 002)
-- ═══════════════════════════════════════════════════════════════════
SELECT 'kb_chunks_embedding_idx' AS polozka,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='kb_chunks_embedding_idx') THEN '✓ OK' ELSE '✗ CHYBÍ' END AS stav
UNION ALL
SELECT 'match_kb_chunks',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='match_kb_chunks') THEN '✓ OK' ELSE '✗ CHYBÍ' END;

-- ═══════════════════════════════════════════════════════════════════
-- 5. SOUHRN – jen to co CHYBÍ
-- ═══════════════════════════════════════════════════════════════════
SELECT 'Chybějící' AS kategorie, polozka FROM (
  SELECT 'extension: vector' AS polozka WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')
  UNION ALL SELECT 'extension: pgcrypto' WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto')
  UNION ALL SELECT 'tabulka: ' || e.tbl FROM (SELECT unnest(ARRAY['users','projects','project_context','sessions','kb_documents','kb_chunks','kb_sync_log','processing_jobs','export_jobs','audit_log']) AS tbl) e
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema='public' AND t.table_name=e.tbl)
  UNION ALL SELECT 'sloupec kb_documents: ' || x.c FROM (SELECT unnest(ARRAY['file_path','file_size','mime_type']) AS c) x
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns col WHERE col.table_schema='public' AND col.table_name='kb_documents' AND col.column_name=x.c)
  UNION ALL SELECT 'index: kb_chunks_embedding_idx' WHERE NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='kb_chunks_embedding_idx')
  UNION ALL SELECT 'funkce: match_kb_chunks' WHERE NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='match_kb_chunks')
) t
ORDER BY polozka;
