-- Create org_api_credentials table for storing encrypted API keys per tenant
CREATE TABLE IF NOT EXISTS org_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  label TEXT,
  account_identifier TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- Enable RLS
ALTER TABLE org_api_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to deny all access (managed via service key)
CREATE POLICY "Deny all access to org_api_credentials"
  ON org_api_credentials
  FOR ALL
  USING (false);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_api_credentials_tenant_provider
  ON org_api_credentials(tenant_id, provider);
