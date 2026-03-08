-- Add conversation_id column to agent_runs table
-- This migration was applied directly to production and is being retroactively
-- added to the repo to reconcile migration drift.
-- Note: agent_runs is later dropped by 20260128000002_drop_agent_tables.sql
-- but this file must exist so Supabase recognizes the migration as applied.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_runs' AND table_schema = 'public') THEN
    ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS conversation_id uuid;
  END IF;
END $$;
