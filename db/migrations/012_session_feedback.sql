-- Explicitní feedback: thumbs up/down na AI výstup
create table if not exists session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  rating int not null check (rating in (1, -1)),
  created_at timestamptz not null default now(),
  unique(session_id, user_id)
);

create index if not exists idx_session_feedback_session_id on session_feedback(session_id);
create index if not exists idx_session_feedback_rating on session_feedback(rating);

-- Implicitní feedback: diff při editaci AI výstupu
create table if not exists session_edits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  original_content text not null,
  edited_content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_edits_session_id on session_edits(session_id);

-- RLS (service_role obchází; anon/authenticated nemají přístup)
alter table session_feedback enable row level security;
alter table session_edits enable row level security;
create policy "rls_session_feedback_deny" on session_feedback for all to anon using (false) with check (false);
create policy "rls_session_feedback_deny_auth" on session_feedback for all to authenticated using (false) with check (false);
create policy "rls_session_edits_deny" on session_edits for all to anon using (false) with check (false);
create policy "rls_session_edits_deny_auth" on session_edits for all to authenticated using (false) with check (false);
