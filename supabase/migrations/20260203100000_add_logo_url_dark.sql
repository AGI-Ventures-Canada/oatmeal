-- Add dark mode logo URL column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url_dark TEXT;
