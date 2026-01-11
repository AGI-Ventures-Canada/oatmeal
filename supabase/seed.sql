-- Seed data for local development
-- This file runs automatically on `supabase db reset` and for preview branches

-- Test tenant (maps to a test Clerk org)
INSERT INTO tenants (id, clerk_org_id, name, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'org_test_local', 'Local Dev Org', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'org_test_demo', 'Demo Organization', now(), now())
ON CONFLICT (clerk_org_id) DO NOTHING;

-- Test API keys (these are hashed versions, not actual keys)
-- For local dev, you can create real keys via the dashboard
INSERT INTO api_keys (id, tenant_id, name, prefix, hash, scopes, created_at)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Local Dev Key',
    'sk_live_test',
    'test_hash_for_local_development_only',
    ARRAY['jobs:create', 'jobs:read'],
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Demo API Key',
    'sk_live_demo',
    'demo_hash_for_local_development_only',
    ARRAY['jobs:create', 'jobs:read', 'jobs:cancel'],
    now()
  )
ON CONFLICT DO NOTHING;

-- Sample jobs for testing UI
INSERT INTO jobs (id, tenant_id, type, status_cache, input, created_at, updated_at)
VALUES
  (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'agent_task',
    'succeeded',
    '{"prompt": "Test task 1"}'::jsonb,
    now() - interval '1 hour',
    now() - interval '30 minutes'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'agent_task',
    'running',
    '{"prompt": "Test task 2"}'::jsonb,
    now() - interval '5 minutes',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    'agent_task',
    'failed',
    '{"prompt": "Test task 3"}'::jsonb,
    now() - interval '2 hours',
    now() - interval '1 hour'
  )
ON CONFLICT DO NOTHING;

-- Sample audit logs
INSERT INTO audit_logs (id, tenant_id, action, actor_type, actor_id, resource_type, resource_id, metadata, created_at)
VALUES
  (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111',
    'api_key.created',
    'user',
    'user_test_123',
    'api_key',
    '33333333-3333-3333-3333-333333333333',
    '{"name": "Local Dev Key"}'::jsonb,
    now() - interval '1 day'
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    '11111111-1111-1111-1111-111111111111',
    'job.created',
    'api_key',
    '33333333-3333-3333-3333-333333333333',
    'job',
    '55555555-5555-5555-5555-555555555555',
    '{"type": "agent_task"}'::jsonb,
    now() - interval '1 hour'
  )
ON CONFLICT DO NOTHING;
