-- Popis a custom fieldy z Asany
alter table projects add column if not exists description text;
alter table projects add column if not exists asana_metadata jsonb default '{}'::jsonb;
