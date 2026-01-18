-- Fix missing RLS on org_api_credentials table
-- The original migration (20260113185334) didn't apply RLS properly

-- Enable RLS (idempotent)
ALTER TABLE org_api_credentials ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Deny all access to org_api_credentials" ON org_api_credentials;

CREATE POLICY "Deny all access to org_api_credentials"
  ON org_api_credentials
  FOR ALL
  USING (false);
