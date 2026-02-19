-- Org-level sponsor library for reuse across hackathons
CREATE TABLE tenant_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  logo_url_dark text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

ALTER TABLE tenant_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON tenant_sponsors FOR ALL USING (false);

-- Link hackathon sponsors back to library entry for logo syncing
ALTER TABLE hackathon_sponsors
  ADD COLUMN tenant_sponsor_id uuid REFERENCES tenant_sponsors(id) ON DELETE SET NULL;
