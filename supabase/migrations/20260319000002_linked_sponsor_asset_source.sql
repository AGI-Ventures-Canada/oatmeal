ALTER TABLE hackathon_sponsors
ADD COLUMN IF NOT EXISTS use_org_assets boolean NOT NULL DEFAULT false;
