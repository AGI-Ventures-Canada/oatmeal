-- Migration: Hackathon Public Pages
-- Adds sponsor support and public profile fields for tenants

-- Create sponsor tier enum
CREATE TYPE sponsor_tier AS ENUM ('title', 'gold', 'silver', 'bronze', 'partner');

-- Create hackathon_sponsors table
CREATE TABLE hackathon_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  sponsor_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier sponsor_tier NOT NULL DEFAULT 'partner',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hackathon_sponsors_hackathon ON hackathon_sponsors(hackathon_id);
CREATE INDEX idx_hackathon_sponsors_tenant ON hackathon_sponsors(sponsor_tenant_id) WHERE sponsor_tenant_id IS NOT NULL;

-- Extend tenants table with public profile fields
ALTER TABLE tenants ADD COLUMN slug text;
ALTER TABLE tenants ADD COLUMN logo_url text;
ALTER TABLE tenants ADD COLUMN description text;
ALTER TABLE tenants ADD COLUMN website_url text;

CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;

-- Enable RLS on hackathon_sponsors (deny all by default, service key bypasses)
ALTER TABLE hackathon_sponsors ENABLE ROW LEVEL SECURITY;
