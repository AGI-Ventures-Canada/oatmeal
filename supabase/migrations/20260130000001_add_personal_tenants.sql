ALTER TABLE tenants ALTER COLUMN clerk_org_id DROP NOT NULL;

ALTER TABLE tenants ADD COLUMN clerk_user_id text;

CREATE UNIQUE INDEX idx_tenants_clerk_user_id ON tenants(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

ALTER TABLE tenants ADD CONSTRAINT tenants_must_have_owner
  CHECK (clerk_org_id IS NOT NULL OR clerk_user_id IS NOT NULL);
