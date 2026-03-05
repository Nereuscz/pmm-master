-- asana_task_id pro projekty importované z Asany (idempotence, deduplikace)
alter table projects add column if not exists asana_task_id text;
create unique index if not exists idx_projects_asana_task_id
  on projects(asana_task_id) where asana_task_id is not null;
