-- Migration 008: Enable Row Level Security (RLS) on all public tables
-- Řeší Supabase Security Review: "RLS Disabled in Public"
--
-- Aplikace používá SUPABASE_SERVICE_ROLE_KEY na serveru – ten RLS obchází.
-- Pro anon/authenticated klienty (PostgREST API) platí: RLS zapnuto + žádné
-- povolující politiky = žádný přístup k datům. Bezpečné.
--
-- Spusť v Supabase Dashboard → SQL Editor

-- ═══════════════════════════════════════════════════════════════════
-- 1. ZAPNOUT RLS NA VŠECH TABULKÁCH
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- 2. POLITIKY: Blokovat anon/authenticated (service_role RLS obchází)
-- ═══════════════════════════════════════════════════════════════════

-- users – citlivá data (tokeny, emaily)
DROP POLICY IF EXISTS "rls_users_deny_anon" ON users;
DROP POLICY IF EXISTS "rls_users_deny_authenticated" ON users;
CREATE POLICY "rls_users_deny_anon" ON users
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_users_deny_authenticated" ON users
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- projects
DROP POLICY IF EXISTS "rls_projects_deny_anon" ON projects;
DROP POLICY IF EXISTS "rls_projects_deny_authenticated" ON projects;
CREATE POLICY "rls_projects_deny_anon" ON projects
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_projects_deny_authenticated" ON projects
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- project_context
DROP POLICY IF EXISTS "rls_project_context_deny_anon" ON project_context;
DROP POLICY IF EXISTS "rls_project_context_deny_authenticated" ON project_context;
CREATE POLICY "rls_project_context_deny_anon" ON project_context
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_project_context_deny_authenticated" ON project_context
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- sessions – transkripty, AI výstupy
DROP POLICY IF EXISTS "rls_sessions_deny_anon" ON sessions;
DROP POLICY IF EXISTS "rls_sessions_deny_authenticated" ON sessions;
CREATE POLICY "rls_sessions_deny_anon" ON sessions
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_sessions_deny_authenticated" ON sessions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- kb_documents
DROP POLICY IF EXISTS "rls_kb_documents_deny_anon" ON kb_documents;
DROP POLICY IF EXISTS "rls_kb_documents_deny_authenticated" ON kb_documents;
CREATE POLICY "rls_kb_documents_deny_anon" ON kb_documents
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_kb_documents_deny_authenticated" ON kb_documents
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- kb_chunks
DROP POLICY IF EXISTS "rls_kb_chunks_deny_anon" ON kb_chunks;
DROP POLICY IF EXISTS "rls_kb_chunks_deny_authenticated" ON kb_chunks;
CREATE POLICY "rls_kb_chunks_deny_anon" ON kb_chunks
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_kb_chunks_deny_authenticated" ON kb_chunks
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- kb_sync_log
DROP POLICY IF EXISTS "rls_kb_sync_log_deny_anon" ON kb_sync_log;
DROP POLICY IF EXISTS "rls_kb_sync_log_deny_authenticated" ON kb_sync_log;
CREATE POLICY "rls_kb_sync_log_deny_anon" ON kb_sync_log
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_kb_sync_log_deny_authenticated" ON kb_sync_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- processing_jobs – citlivé sloupce (error_message, error_code)
DROP POLICY IF EXISTS "rls_processing_jobs_deny_anon" ON processing_jobs;
DROP POLICY IF EXISTS "rls_processing_jobs_deny_authenticated" ON processing_jobs;
CREATE POLICY "rls_processing_jobs_deny_anon" ON processing_jobs
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_processing_jobs_deny_authenticated" ON processing_jobs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- export_jobs – citlivé sloupce (created_objects_json, error_payload)
DROP POLICY IF EXISTS "rls_export_jobs_deny_anon" ON export_jobs;
DROP POLICY IF EXISTS "rls_export_jobs_deny_authenticated" ON export_jobs;
CREATE POLICY "rls_export_jobs_deny_anon" ON export_jobs
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_export_jobs_deny_authenticated" ON export_jobs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- audit_log
DROP POLICY IF EXISTS "rls_audit_log_deny_anon" ON audit_log;
DROP POLICY IF EXISTS "rls_audit_log_deny_authenticated" ON audit_log;
CREATE POLICY "rls_audit_log_deny_anon" ON audit_log
  FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "rls_audit_log_deny_authenticated" ON audit_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
