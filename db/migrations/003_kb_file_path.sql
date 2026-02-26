-- Migration 003: Add file metadata columns to kb_documents
-- Run this in Supabase SQL Editor

ALTER TABLE kb_documents
  ADD COLUMN IF NOT EXISTS file_path  text,
  ADD COLUMN IF NOT EXISTS file_size  bigint,
  ADD COLUMN IF NOT EXISTS mime_type  text;

-- Supabase Storage bucket for raw uploaded files
-- Create via Supabase Dashboard > Storage > New bucket
-- Name: kb-documents, Public: false
-- Or via API:
-- insert into storage.buckets (id, name, public) values ('kb-documents', 'kb-documents', false);
