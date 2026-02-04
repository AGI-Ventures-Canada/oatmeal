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
  ('77777777-7777-7777-7777-777777777777', 'org_openai', 'OpenAI', 'openai', 'AI research and deployment company', 'https://openai.com', now(), now()),
  ('12345678-1234-1234-1234-123456789012', 'org_3998CZRtAOrKPFpY9g5RBuUN3Py', 'AGI Ventures Canada', 'agi-ventures-canada', NULL, NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Personal tenant (maps to a Clerk user)
INSERT INTO tenants (id, clerk_user_id, name, slug, description, website_url, created_at, updated_at)
VALUES
  ('87654321-4321-4321-4321-210987654321', 'user_38vEFI8UesKwM07qIuFNqEzFavS', 'Test User', 'test-user', 'Personal tenant for test user', NULL, now(), now())
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
  ),
  (
    'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    '12345678-1234-1234-1234-123456789012',
    'AGI Ventures Innovation Summit 2026',
    'agi-innovation-summit-2026',
    'Join AGI Ventures Canada for our flagship innovation summit! Build cutting-edge AI solutions that push the boundaries of what''s possible. Whether you''re working on AGI research, practical AI applications, or novel AI architectures, this is your chance to showcase your vision.',
    '1. Teams of 1-5 people
2. All projects must incorporate AI/ML technologies
3. Code must be written during the hackathon period
4. Projects must include a working demo or prototype
5. Judging criteria: Innovation, Technical Depth, Market Potential, Presentation Quality
6. Grand prize: $25,000 CAD + mentorship opportunity',
    now() + interval '20 days',
    now() + interval '22 days',
    now() - interval '5 days',
    now() + interval '18 days',
    'published',
    1,
    5,
    true,
    now() - interval '10 days',
    now()
  ),
  (
    'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    '12345678-1234-1234-1234-123456789012',
    'Canadian AI Startup Challenge',
    'canadian-ai-startup-challenge',
    'Calling all Canadian entrepreneurs and developers! Build AI-powered startups that solve real problems. From healthcare to fintech, from climate tech to education, show us how AI can transform industries and create value.',
    '1. Open to Canadian residents and students
2. Teams of 2-6 people
3. Must address a real market problem
4. Business plan required alongside technical demo
5. Top 5 teams receive seed funding and accelerator access
6. Must be able to present in English or French',
    now() + interval '50 days',
    now() + interval '52 days',
    now() + interval '10 days',
    now() + interval '45 days',
    'published',
    2,
    6,
    false,
    now() - interval '3 days',
    now()
  ),
  (
    'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
    '12345678-1234-1234-1234-123456789012',
    'AGI Research Hackathon',
    'agi-research-hackathon',
    'A specialized hackathon for researchers, PhD students, and advanced practitioners working on AGI-related problems. Focus on alignment, reasoning, multi-agent systems, or novel architectures.',
    '1. Open to researchers, graduate students, and experienced practitioners
2. Solo or teams up to 4
3. Research papers or technical reports welcome
4. Access to advanced AI models and compute resources
5. Top research projects may be considered for publication support
6. 48-hour intensive format',
    now() + interval '75 days',
    now() + interval '77 days',
    now() + interval '20 days',
    now() + interval '70 days',
    'published',
    1,
    4,
    true,
    now(),
    now()
  ),
  (
    'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
    '12345678-1234-1234-1234-123456789012',
    'Healthcare AI Innovation Challenge',
    'healthcare-ai-challenge',
    'Build AI solutions that improve healthcare outcomes. From diagnostic tools to patient care systems, from drug discovery to telemedicine, use AI to make healthcare more accessible and effective.',
    '1. Teams of 1-4 people
2. Must address a real healthcare challenge
3. HIPAA compliance considerations required
4. Working prototype or demo required
5. Top 3 teams receive $15,000 CAD and healthcare industry mentorship
6. Open to all skill levels',
    now() + interval '35 days',
    now() + interval '37 days',
    now() - interval '2 days',
    now() + interval '32 days',
    'published',
    1,
    4,
    true,
    now() - interval '8 days',
    now()
  ),
  (
    'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
    '12345678-1234-1234-1234-123456789012',
    'Climate AI Solutions Hack',
    'climate-ai-solutions',
    'Tackle climate change with AI! Build solutions for carbon tracking, renewable energy optimization, climate prediction, or sustainable agriculture. Help create a more sustainable future.',
    '1. Teams of 2-5 people
2. Must address climate or environmental challenges
3. Use of public climate data encouraged
4. Impact measurement required
5. Winners receive $10,000 CAD and potential pilot opportunities
6. 36-hour hackathon format',
    now() + interval '90 days',
    now() + interval '91 days',
    now() + interval '30 days',
    now() + interval '85 days',
    'published',
    2,
    5,
    false,
    now() - interval '1 day',
    now()
  ),
  (
    'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6',
    '12345678-1234-1234-1234-123456789012',
    'FinTech AI Buildathon',
    'fintech-ai-buildathon',
    'Revolutionize financial services with AI. Build solutions for fraud detection, algorithmic trading, personal finance, credit scoring, or blockchain applications. Show us the future of finance.',
    '1. Teams of 1-4 people
2. Must incorporate AI/ML in financial applications
3. Security and compliance considerations required
4. Working demo required
5. Top projects receive $20,000 CAD and fintech accelerator access
6. Regulatory guidance provided',
    now() + interval '12 days',
    now() + interval '14 days',
    now() - interval '7 days',
    now() + interval '10 days',
    'published',
    1,
    4,
    true,
    now() - interval '12 days',
    now()
  ),
  (
    'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7',
    '12345678-1234-1234-1234-123456789012',
    'Education AI Hack',
    'education-ai-hack',
    'Transform education with AI! Build tools for personalized learning, student assessment, content generation, or accessibility. Help make quality education accessible to everyone.',
    '1. Teams of 1-5 people
2. Focus on educational technology solutions
3. Must demonstrate learning outcomes or accessibility improvements
4. Prototype or demo required
5. Top 3 teams receive $12,000 CAD and education sector partnerships
6. Open to educators, students, and developers',
    now() + interval '60 days',
    now() + interval '62 days',
    now() + interval '15 days',
    now() + interval '55 days',
    'published',
    1,
    5,
    true,
    now() - interval '2 days',
    now()
  ),
  (
    'b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8',
    '12345678-1234-1234-1234-123456789012',
    'AI for Good Social Impact Challenge',
    'ai-for-good-challenge',
    'Use AI to solve social problems! Address issues like poverty, inequality, accessibility, mental health, or community building. Make a positive impact on society.',
    '1. Teams of 2-6 people
2. Must address a social or community challenge
3. Impact measurement and user research required
4. Working prototype or pilot required
5. Winners receive $18,000 CAD and nonprofit partnerships
6. Focus on sustainable, scalable solutions',
    now() + interval '100 days',
    now() + interval '102 days',
    now() + interval '40 days',
    now() + interval '95 days',
    'published',
    2,
    6,
    false,
    now() + interval '2 days',
    now()
  ),
  (
    'c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9',
    '12345678-1234-1234-1234-123456789012',
    'Robotics & AI Integration Hack',
    'robotics-ai-integration',
    'Combine robotics and AI! Build autonomous systems, robotic assistants, or AI-powered automation. Whether it''s manufacturing, service robots, or research platforms, show us the future of robotics.',
    '1. Teams of 2-5 people
2. Must combine hardware and AI software
3. Physical demo or simulation required
4. Safety considerations mandatory
5. Top projects receive $22,000 CAD and robotics lab access
6. Hardware kits available for loan',
    now() + interval '120 days',
    now() + interval '122 days',
    now() + interval '50 days',
    now() + interval '115 days',
    'published',
    2,
    5,
    false,
    now() + interval '5 days',
    now()
  ),
  (
    'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
    '12345678-1234-1234-1234-123456789012',
    'AI Art & Creative Expression Contest',
    'ai-art-creative-contest',
    'Explore the intersection of AI and creativity! Build tools for art generation, music composition, storytelling, or creative workflows. Push the boundaries of AI-assisted creativity.',
    '1. Solo or teams up to 3
2. Focus on creative applications of AI
3. Portfolio or demo required
4. Multiple categories: visual art, music, writing, interactive media
5. Winners receive $8,000 CAD and gallery exhibition opportunities
6. Open to artists, musicians, writers, and developers',
    now() + interval '8 days',
    now() + interval '10 days',
    now() - interval '10 days',
    now() + interval '6 days',
    'published',
    1,
    3,
    true,
    now() - interval '15 days',
    now()
  ),
  (
    'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
    '12345678-1234-1234-1234-123456789012',
    'AI Security & Privacy Hackathon',
    'ai-security-privacy',
    'Secure the AI future! Build tools for AI security, privacy-preserving ML, adversarial defense, or secure AI deployment. Help make AI systems more trustworthy and secure.',
    '1. Teams of 1-4 people
2. Focus on security, privacy, or trust in AI systems
3. Security analysis or proof-of-concept required
4. Open to security researchers and developers
5. Top projects receive $15,000 CAD and security research partnerships
6. 24-hour intensive format',
    now() + interval '25 days',
    now() + interval '26 days',
    now() + interval '3 days',
    now() + interval '23 days',
    'published',
    1,
    4,
    true,
    now() - interval '6 days',
    now()
  ),
  (
    'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2',
    '12345678-1234-1234-1234-123456789012',
    'Student AI Innovation Challenge',
    'student-ai-innovation',
    'Exclusively for students! Showcase your AI projects and compete with peers. Open to high school, undergraduate, and graduate students. Build something amazing and launch your AI career.',
    '1. Open only to students (high school, undergraduate, graduate)
2. Teams of 1-4 people
3. Student ID verification required
4. All projects welcome - research, applications, or demos
5. Winners receive $5,000 CAD, internships, and mentorship
6. Special prizes for high school participants',
    now() + interval '15 days',
    now() + interval '17 days',
    now() - interval '3 days',
    now() + interval '13 days',
    'published',
    1,
    4,
    true,
    now() - interval '9 days',
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

