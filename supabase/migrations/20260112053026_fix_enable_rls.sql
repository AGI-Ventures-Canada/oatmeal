-- Fix: Enable RLS on all tables (was marked as applied but not actually run)
-- Application accesses data via service key which bypasses RLS

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create deny-all policies (skip if already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenants' AND policyname = 'Deny all access to tenants') THEN
        CREATE POLICY "Deny all access to tenants" ON tenants FOR ALL USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Deny all access to api_keys') THEN
        CREATE POLICY "Deny all access to api_keys" ON api_keys FOR ALL USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Deny all access to jobs') THEN
        CREATE POLICY "Deny all access to jobs" ON jobs FOR ALL USING (false);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'Deny all access to audit_logs') THEN
        CREATE POLICY "Deny all access to audit_logs" ON audit_logs FOR ALL USING (false);
    END IF;
END $$;
