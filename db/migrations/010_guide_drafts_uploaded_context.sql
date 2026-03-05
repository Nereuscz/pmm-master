-- Migration 010: add uploaded_context to guide_drafts for storing transcript/attachment text

alter table guide_drafts add column if not exists uploaded_context text default '';
