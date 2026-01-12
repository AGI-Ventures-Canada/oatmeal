-- Enable RLS on all tables with DENY ALL policies
-- Application accesses data via service key which bypasses RLS
-- This prevents any other clients from accessing data

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create deny-all policies (empty policies = deny all by default)
-- The service key bypasses RLS, so the application can still access data

CREATE POLICY "Deny all access to tenants" ON tenants FOR ALL USING (false);
CREATE POLICY "Deny all access to api_keys" ON api_keys FOR ALL USING (false);
CREATE POLICY "Deny all access to jobs" ON jobs FOR ALL USING (false);
CREATE POLICY "Deny all access to audit_logs" ON audit_logs FOR ALL USING (false);
