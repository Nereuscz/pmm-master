-- Asana sync snapshot: týdenní přehled tasků pro AI kontext
create table if not exists asana_sync_snapshot (
  project_id uuid primary key references projects(id) on delete cascade,
  snapshot_text text not null default '',
  synced_at timestamptz not null default now(),
  task_count int not null default 0,
  section_count int not null default 0
);

create index if not exists idx_asana_sync_snapshot_synced_at on asana_sync_snapshot(synced_at);

-- Log sync operací
create table if not exists asana_sync_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null,
  error_message text,
  duration_ms int,
  synced_at timestamptz not null default now()
);

create index if not exists idx_asana_sync_log_project_id on asana_sync_log(project_id);
create index if not exists idx_asana_sync_log_synced_at on asana_sync_log(synced_at);

-- RLS (service_role obchází; anon/authenticated nemají přístup)
alter table asana_sync_snapshot enable row level security;
alter table asana_sync_log enable row level security;
create policy "rls_asana_sync_snapshot_deny" on asana_sync_snapshot for all to anon using (false) with check (false);
create policy "rls_asana_sync_snapshot_deny_auth" on asana_sync_snapshot for all to authenticated using (false) with check (false);
create policy "rls_asana_sync_log_deny" on asana_sync_log for all to anon using (false) with check (false);
create policy "rls_asana_sync_log_deny_auth" on asana_sync_log for all to authenticated using (false) with check (false);
