-- PM Assistant – kompletní SQL pro Supabase
-- Spusť v Supabase Dashboard → SQL Editor → New query
-- Pořadí: 1) schema, 2) migrace 001–005

-- ═══════════════════════════════════════════════════════════════════
-- 1. ZÁKLADNÍ SCHEMA (db/schema.sql)
-- ═══════════════════════════════════════════════════════════════════
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  ms_id text unique,
  asana_user_id text unique,
  role text not null default 'PM',
  asana_token_encrypted text,
  asana_refresh_token text,
  asana_token_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  framework text not null check (framework in ('Univerzální', 'Produktový')),
  phase text not null,
  owner_id uuid not null references users(id) on delete cascade,
  asana_project_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_context (
  project_id uuid primary key references projects(id) on delete cascade,
  accumulated_context text not null default '',
  last_updated timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  phase text not null,
  transcript text not null,
  ai_output text not null,
  kb_chunks_used text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  source text not null check (source in ('upload', 'sharepoint', 'url')),
  sharepoint_id text,
  source_url text,
  uploaded_by uuid references users(id),
  source_text text not null default '',
  visibility text not null default 'global' check (visibility in ('global', 'team')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references kb_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  chunk_index int not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists kb_sync_log (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  file_id text,
  document_id uuid references kb_documents(id) on delete set null,
  change_type text not null default 'unknown',
  status text not null,
  changes_detected int not null default 0,
  duration_ms int,
  synced_at timestamptz not null default now()
);

create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  status text not null,
  error_code text,
  error_message text,
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists export_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  asana_project_id text not null,
  status text not null,
  idempotency_key text not null unique,
  created_objects_json jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRACE 001 (v12 upgrade)
-- ═══════════════════════════════════════════════════════════════════
alter table if exists projects
  add column if not exists updated_at timestamptz not null default now();

alter table if exists kb_documents
  add column if not exists source_text text not null default '',
  add column if not exists visibility text not null default 'global';

alter table if exists kb_documents
  drop constraint if exists kb_documents_visibility_check;

alter table if exists kb_documents
  add constraint kb_documents_visibility_check check (visibility in ('global', 'team'));

-- ═══════════════════════════════════════════════════════════════════
-- 3. MIGRACE 002 (vector search + RPC)
-- ═══════════════════════════════════════════════════════════════════
-- IVFFLAT index: pokud je kb_chunks prázdná, může selhat – spusť po prvním uploadu
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
  ON kb_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

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

-- ═══════════════════════════════════════════════════════════════════
-- 4. MIGRACE 003 (file metadata pro KB)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE kb_documents
  ADD COLUMN IF NOT EXISTS file_path  text,
  ADD COLUMN IF NOT EXISTS file_size  bigint,
  ADD COLUMN IF NOT EXISTS mime_type  text;

-- ═══════════════════════════════════════════════════════════════════
-- 5. MIGRACE 004 (audit log)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action text not null,
  resource_type text not null,
  resource_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_user_id on audit_log(user_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- 6. MIGRACE 005 (Asana OAuth)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_token_expires_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════
-- 7. MIGRACE 006 (Asana přihlášení)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_user_id text UNIQUE;

-- ═══════════════════════════════════════════════════════════════════
-- 8. MIGRACE 007 (KB URL zdroj)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE kb_documents ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE kb_documents DROP CONSTRAINT IF EXISTS kb_documents_source_check;
ALTER TABLE kb_documents ADD CONSTRAINT kb_documents_source_check
  CHECK (source IN ('upload', 'sharepoint', 'url'));

-- ═══════════════════════════════════════════════════════════════════
-- 9. DEV FALLBACK USER (pro lokální vývoj bez Asana)
-- ═══════════════════════════════════════════════════════════════════
insert into users (id, email, role)
values ('00000000-0000-0000-0000-000000000001', 'dev@pm-assistant.local', 'Admin')
on conflict (email) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- 10. MIGRACE 008 (RLS – Row Level Security)
-- ═══════════════════════════════════════════════════════════════════
-- Aplikace používá SUPABASE_SERVICE_ROLE_KEY – ten RLS obchází.
-- Pro anon/authenticated klienty: RLS zapnuto + deny politiky = žádný přístup.

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

DROP POLICY IF EXISTS "rls_users_deny_anon" ON users;
DROP POLICY IF EXISTS "rls_users_deny_authenticated" ON users;
CREATE POLICY "rls_users_deny_anon" ON users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_users_deny_authenticated" ON users FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_projects_deny_anon" ON projects;
DROP POLICY IF EXISTS "rls_projects_deny_authenticated" ON projects;
CREATE POLICY "rls_projects_deny_anon" ON projects FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_projects_deny_authenticated" ON projects FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_project_context_deny_anon" ON project_context;
DROP POLICY IF EXISTS "rls_project_context_deny_authenticated" ON project_context;
CREATE POLICY "rls_project_context_deny_anon" ON project_context FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_project_context_deny_authenticated" ON project_context FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_sessions_deny_anon" ON sessions;
DROP POLICY IF EXISTS "rls_sessions_deny_authenticated" ON sessions;
CREATE POLICY "rls_sessions_deny_anon" ON sessions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_sessions_deny_authenticated" ON sessions FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_kb_documents_deny_anon" ON kb_documents;
DROP POLICY IF EXISTS "rls_kb_documents_deny_authenticated" ON kb_documents;
CREATE POLICY "rls_kb_documents_deny_anon" ON kb_documents FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_kb_documents_deny_authenticated" ON kb_documents FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_kb_chunks_deny_anon" ON kb_chunks;
DROP POLICY IF EXISTS "rls_kb_chunks_deny_authenticated" ON kb_chunks;
CREATE POLICY "rls_kb_chunks_deny_anon" ON kb_chunks FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_kb_chunks_deny_authenticated" ON kb_chunks FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_kb_sync_log_deny_anon" ON kb_sync_log;
DROP POLICY IF EXISTS "rls_kb_sync_log_deny_authenticated" ON kb_sync_log;
CREATE POLICY "rls_kb_sync_log_deny_anon" ON kb_sync_log FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_kb_sync_log_deny_authenticated" ON kb_sync_log FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_processing_jobs_deny_anon" ON processing_jobs;
DROP POLICY IF EXISTS "rls_processing_jobs_deny_authenticated" ON processing_jobs;
CREATE POLICY "rls_processing_jobs_deny_anon" ON processing_jobs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_processing_jobs_deny_authenticated" ON processing_jobs FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_export_jobs_deny_anon" ON export_jobs;
DROP POLICY IF EXISTS "rls_export_jobs_deny_authenticated" ON export_jobs;
CREATE POLICY "rls_export_jobs_deny_anon" ON export_jobs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_export_jobs_deny_authenticated" ON export_jobs FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_audit_log_deny_anon" ON audit_log;
DROP POLICY IF EXISTS "rls_audit_log_deny_authenticated" ON audit_log;
CREATE POLICY "rls_audit_log_deny_anon" ON audit_log FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "rls_audit_log_deny_authenticated" ON audit_log FOR ALL TO authenticated USING (false) WITH CHECK (false);
