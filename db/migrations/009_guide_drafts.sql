-- Migration 009: guide_drafts table for autosaving in-progress guide chat sessions

create table if not exists guide_drafts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  phase       text not null,
  framework   text not null,
  owner_id    uuid not null references users(id) on delete cascade,
  answers     jsonb not null default '[]',
  messages    jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- One active draft per user per project+phase+framework combination
  unique(project_id, phase, framework, owner_id)
);

alter table guide_drafts enable row level security;

create policy "guide_drafts_owner_select" on guide_drafts
  for select using (owner_id = auth.uid());

create policy "guide_drafts_owner_insert" on guide_drafts
  for insert with check (owner_id = auth.uid());

create policy "guide_drafts_owner_update" on guide_drafts
  for update using (owner_id = auth.uid());

create policy "guide_drafts_owner_delete" on guide_drafts
  for delete using (owner_id = auth.uid());
