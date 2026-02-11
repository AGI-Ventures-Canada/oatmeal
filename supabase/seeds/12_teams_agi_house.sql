-- ============================================================================
-- AGI HOUSE TEAMS
-- Depends on: hackathons, participants
-- ============================================================================

-- MCP Agents Hackathon — 5 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('a9f00001-a9f0-a9f0-a9f0-a9f00001a9f0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'Protocol Pioneers', 'user_seed_071', 'SEED-MCP-001', 'locked', now() - interval '36 days', now() - interval '23 days'),
  ('a9f00002-a9f0-a9f0-a9f0-a9f00002a9f0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'Server Syndicate', 'user_seed_074', 'SEED-MCP-002', 'locked', now() - interval '35 days', now() - interval '23 days'),
  ('a9f00003-a9f0-a9f0-a9f0-a9f00003a9f0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'Tool Smiths', 'user_seed_077', 'SEED-MCP-003', 'locked', now() - interval '34 days', now() - interval '23 days'),
  ('a9f00004-a9f0-a9f0-a9f0-a9f00004a9f0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'Context Crew', 'user_seed_080', 'SEED-MCP-004', 'locked', now() - interval '33 days', now() - interval '23 days'),
  ('a9f00005-a9f0-a9f0-a9f0-a9f00005a9f0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'Resource Runners', 'user_seed_083', 'SEED-MCP-005', 'locked', now() - interval '32 days', now() - interval '23 days')
ON CONFLICT (id) DO NOTHING;

-- GenAI Goes Local — 4 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('a9f00006-a9f0-a9f0-a9f0-a9f00006a9f0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'Edge Lords', 'user_seed_091', 'SEED-LOC-001', 'locked', now() - interval '56 days', now() - interval '44 days'),
  ('a9f00007-a9f0-a9f0-a9f0-a9f00007a9f0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'Quantized Minds', 'user_seed_094', 'SEED-LOC-002', 'locked', now() - interval '55 days', now() - interval '44 days'),
  ('a9f00008-a9f0-a9f0-a9f0-a9f00008a9f0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'On-Device AI', 'user_seed_097', 'SEED-LOC-003', 'locked', now() - interval '54 days', now() - interval '44 days'),
  ('a9f00009-a9f0-a9f0-a9f0-a9f00009a9f0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'Silicon Whisperers', 'user_seed_100', 'SEED-LOC-004', 'locked', now() - interval '53 days', now() - interval '44 days')
ON CONFLICT (id) DO NOTHING;

-- Generative UI Hackathon — 5 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('a9f0000a-a9f0-a9f0-a9f0-a9f0000aa9f0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'Pixel Wizards', 'user_seed_106', 'SEED-GUI-001', 'locked', now() - interval '76 days', now() - interval '65 days'),
  ('a9f0000b-a9f0-a9f0-a9f0-a9f0000ba9f0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'Layout Engine', 'user_seed_109', 'SEED-GUI-002', 'locked', now() - interval '75 days', now() - interval '65 days'),
  ('a9f0000c-a9f0-a9f0-a9f0-a9f0000ca9f0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'Component Factory', 'user_seed_112', 'SEED-GUI-003', 'locked', now() - interval '74 days', now() - interval '65 days'),
  ('a9f0000d-a9f0-a9f0-a9f0-a9f0000da9f0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'Render Rebels', 'user_seed_115', 'SEED-GUI-004', 'locked', now() - interval '73 days', now() - interval '65 days'),
  ('a9f0000e-a9f0-a9f0-a9f0-a9f0000ea9f0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'CSS Alchemists', 'user_seed_118', 'SEED-GUI-005', 'locked', now() - interval '72 days', now() - interval '65 days')
ON CONFLICT (id) DO NOTHING;
