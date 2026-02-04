-- Seed data for local development
-- This file runs automatically on `supabase db reset` and for preview branches

-- ============================================================================
-- PERSONAL TENANT (Your local dev user)
-- ============================================================================
INSERT INTO tenants (id, clerk_user_id, name, slug, description, created_at, updated_at)
VALUES
  ('d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'user_39BZw9GPM79s3lcPIZn8tDLtoQg', 'Dwayne Joseph', 'dwayne-joseph', 'Personal workspace for local development', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORGANIZATION TENANTS (Test orgs for hackathons)
-- ============================================================================
-- Test tenant (maps to a test Clerk org)
INSERT INTO tenants (id, clerk_org_id, name, slug, description, website_url, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'org_test_local', 'Local Dev Org', 'local-dev', 'Local development organization', 'https://localhost:3000', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'org_test_demo', 'Demo Organization', 'demo', 'Demo organization for testing', 'https://demo.example.com', now(), now()),
  ('55555555-5555-5555-5555-555555555555', 'org_tavily', 'Tavily', 'tavily', 'AI-powered search API for developers', 'https://tavily.com', now(), now()),
  ('66666666-6666-6666-6666-666666666666', 'org_anthropic', 'Anthropic', 'anthropic', 'AI safety company building reliable, interpretable AI systems', 'https://anthropic.com', now(), now()),
  ('77777777-7777-7777-7777-777777777777', 'org_openai', 'OpenAI', 'openai', 'AI research and deployment company', 'https://openai.com', now(), now())
ON CONFLICT (id) DO NOTHING;

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
    ARRAY['agents:run', 'agents:read'],
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Demo API Key',
    'sk_live_demo',
    'demo_hash_for_local_development_only',
    ARRAY['agents:run', 'agents:read', 'runs:read'],
    now()
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
  )
ON CONFLICT DO NOTHING;

-- Sample hackathons (will be linked to user's actual org when created via dashboard)
-- These are for the demo org to show on browse page
INSERT INTO hackathons (id, tenant_id, name, slug, description, rules, starts_at, ends_at, registration_opens_at, registration_closes_at, status, min_team_size, max_team_size, allow_solo, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'AI Agents Hackathon 2026',
    'ai-agents-2026',
    'Build the next generation of AI agents! Join us for a weekend of innovation, collaboration, and creativity. Whether you''re building autonomous agents, multi-agent systems, or novel AI applications, this hackathon is for you.',
    '1. Teams of 1-4 people
2. All code must be written during the hackathon
3. You may use any AI APIs and frameworks
4. Projects must include a working demo
5. Judging criteria: Innovation, Technical Execution, Impact, Presentation',
    now() + interval '30 days',
    now() + interval '32 days',
    now() - interval '7 days',
    now() + interval '28 days',
    'published',
    1,
    4,
    true,
    now() - interval '14 days',
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Climate Tech Challenge',
    'climate-tech-2026',
    'Hack for the planet! Build solutions that address climate change, sustainability, and environmental challenges. From carbon tracking to renewable energy optimization, bring your ideas to life.',
    '1. Open to all skill levels
2. Teams of 2-5 people
3. Must address a real climate/environmental challenge
4. Use of open data sources encouraged
5. Top 3 teams receive prizes and mentorship',
    now() + interval '60 days',
    now() + interval '62 days',
    now(),
    now() + interval '55 days',
    'published',
    2,
    5,
    false,
    now() - interval '7 days',
    now()
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '55555555-5555-5555-5555-555555555555',
    'Search & Discovery Hack',
    'search-discovery-hack',
    'Sponsored by Tavily. Build innovative search and discovery experiences using AI. From semantic search to knowledge graphs, show us what''s possible with modern search technology.',
    '1. Must use Tavily API
2. Solo or teams up to 3
3. 24-hour hackathon
4. Free API credits provided
5. Winner gets $5,000 and featured integration',
    now() + interval '14 days',
    now() + interval '15 days',
    now() - interval '3 days',
    now() + interval '13 days',
    'published',
    1,
    3,
    true,
    now() - interval '10 days',
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '66666666-6666-6666-6666-666666666666',
    'Anthropic AI Safety Jam',
    'ai-safety-jam',
    'Join Anthropic for a hackathon focused on AI safety and alignment. Build tools, demos, and research prototypes that help make AI systems more safe, honest, and harmless.',
    '1. Focus on AI safety/alignment
2. Teams of 1-4
3. Research papers welcome alongside code
4. Claude API access provided
5. Top projects may be invited to present at Anthropic',
    now() + interval '45 days',
    now() + interval '47 days',
    now() + interval '7 days',
    now() + interval '40 days',
    'published',
    1,
    4,
    true,
    now() - interval '5 days',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Sample sponsors for hackathons
INSERT INTO hackathon_sponsors (id, hackathon_id, sponsor_tenant_id, name, logo_url, website_url, tier, display_order, created_at)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '55555555-5555-5555-5555-555555555555',
    'Tavily',
    NULL,
    'https://tavily.com',
    'gold',
    0,
    now()
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '66666666-6666-6666-6666-666666666666',
    'Anthropic',
    NULL,
    'https://anthropic.com',
    'gold',
    1,
    now()
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '77777777-7777-7777-7777-777777777777',
    'OpenAI',
    NULL,
    'https://openai.com',
    'silver',
    0,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HACKATHON REGISTRATIONS (Your user registered for sample hackathons)
-- ============================================================================
INSERT INTO hackathon_participants (id, hackathon_id, clerk_user_id, role, registered_at)
VALUES
  ('d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user_39BZw9GPM79s3lcPIZn8tDLtoQg', 'participant', now()),
  ('d3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user_39BZw9GPM79s3lcPIZn8tDLtoQg', 'participant', now()),
  ('d4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'user_39BZw9GPM79s3lcPIZn8tDLtoQg', 'participant', now()),
  ('d5d5d5d5-d5d5-d5d5-d5d5-d5d5d5d5d5d5', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'user_39BZw9GPM79s3lcPIZn8tDLtoQg', 'participant', now())
ON CONFLICT (id) DO NOTHING;

