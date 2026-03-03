-- Audit log pro spec §11.1 MUST
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
