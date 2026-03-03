-- Migration 007: Add URL source support to kb_documents
-- Run this in Supabase SQL Editor

ALTER TABLE kb_documents
  ADD COLUMN IF NOT EXISTS source_url text;

-- Drop old source check and add new one with 'url'
ALTER TABLE kb_documents
  DROP CONSTRAINT IF EXISTS kb_documents_source_check;

ALTER TABLE kb_documents
  ADD CONSTRAINT kb_documents_source_check
  CHECK (source IN ('upload', 'sharepoint', 'url'));
