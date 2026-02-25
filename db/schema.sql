-- PM Assistant v0.1 schema baseline for Supabase PostgreSQL.
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  ms_id text unique,
  role text not null default 'PM',
  asana_token_encrypted text,
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
  source text not null check (source in ('upload', 'sharepoint')),
  sharepoint_id text,
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
