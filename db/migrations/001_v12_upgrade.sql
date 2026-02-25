alter table if exists projects
  add column if not exists updated_at timestamptz not null default now();

alter table if exists kb_documents
  add column if not exists source_text text not null default '',
  add column if not exists visibility text not null default 'global';

alter table if exists kb_documents
  drop constraint if exists kb_documents_visibility_check;

alter table if exists kb_documents
  add constraint kb_documents_visibility_check check (visibility in ('global', 'team'));
