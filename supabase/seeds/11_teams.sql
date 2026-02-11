-- ============================================================================
-- SEED TEAMS
-- Depends on: hackathons, participants
-- ============================================================================

-- AI Agents 2026 — 7 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('20012001-2001-2001-2001-200120012001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Neural Navigators', 'user_seed_001', 'SEED-A-001', 'locked', now() - interval '38 days', now() - interval '16 days'),
  ('20022002-2002-2002-2002-200220022002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Agent Smiths', 'user_seed_004', 'SEED-A-002', 'locked', now() - interval '36 days', now() - interval '16 days'),
  ('20032003-2003-2003-2003-200320032003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Autonomous Minds', 'user_seed_007', 'SEED-A-003', 'locked', now() - interval '34 days', now() - interval '16 days'),
  ('20042004-2004-2004-2004-200420042004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Swarm Intelligence', 'user_seed_010', 'SEED-A-004', 'locked', now() - interval '32 days', now() - interval '16 days'),
  ('20052005-2005-2005-2005-200520052005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ReAct Squad', 'user_seed_013', 'SEED-A-005', 'locked', now() - interval '30 days', now() - interval '16 days'),
  ('20062006-2006-2006-2006-200620062006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chain of Thought', 'user_seed_016', 'SEED-A-006', 'locked', now() - interval '28 days', now() - interval '16 days'),
  ('20072007-2007-2007-2007-200720072007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tool Callers', 'user_seed_019', 'SEED-A-007', 'locked', now() - interval '26 days', now() - interval '16 days')
ON CONFLICT (id) DO NOTHING;

-- Search & Discovery — 4 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('20082008-2008-2008-2008-200820082008', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Query Wizards', 'user_seed_001', 'SEED-S-001', 'locked', now() - interval '46 days', now() - interval '32 days'),
  ('20092009-2009-2009-2009-200920092009', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Semantic Seekers', 'user_seed_026', 'SEED-S-002', 'locked', now() - interval '44 days', now() - interval '32 days'),
  ('200a200a-200a-200a-200a-200a200a200a', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Index Architects', 'user_seed_029', 'SEED-S-003', 'locked', now() - interval '42 days', now() - interval '32 days'),
  ('200b200b-200b-200b-200b-200b200b200b', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Retrieval Rangers', 'user_seed_032', 'SEED-S-004', 'locked', now() - interval '40 days', now() - interval '32 days')
ON CONFLICT (id) DO NOTHING;

-- AI Art & Creative — 5 teams
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  ('200c200c-200c-200c-200c-200c200c200c', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Pixel Dreamers', 'user_seed_002', 'SEED-C-001', 'locked', now() - interval '76 days', now() - interval '62 days'),
  ('200d200d-200d-200d-200d-200d200d200d', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Creative Circuits', 'user_seed_038', 'SEED-C-002', 'locked', now() - interval '74 days', now() - interval '62 days'),
  ('200e200e-200e-200e-200e-200e200e200e', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Neural Canvas', 'user_seed_041', 'SEED-C-003', 'locked', now() - interval '72 days', now() - interval '62 days'),
  ('200f200f-200f-200f-200f-200f200f200f', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Generative Collective', 'user_seed_044', 'SEED-C-004', 'locked', now() - interval '70 days', now() - interval '62 days'),
  ('20102010-2010-2010-2010-201020102010', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Diffusion Lab', 'user_seed_048', 'SEED-C-005', 'locked', now() - interval '68 days', now() - interval '62 days')
ON CONFLICT (id) DO NOTHING;

-- Teams for completed hackathon submissions
INSERT INTO teams (id, hackathon_id, name, captain_clerk_user_id, invite_code, status, created_at, updated_at)
VALUES
  -- AI Art & Creative Expression Contest teams
  ('e1010101-0101-0101-0101-010101010101', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Synesthesia Labs', 'user_alice_chen_001', 'SYNTH-2026-ART1', 'locked', now() - interval '65 days', now() - interval '60 days'),
  ('e2020202-0202-0202-0202-020202020202', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Haiku Hackers', 'user_maya_patel_002', 'HAIKU-2026-ART2', 'locked', now() - interval '65 days', now() - interval '61 days'),
  ('e3030303-0303-0303-0303-030303030303', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Neural Harmonics', 'user_james_wilson_003', 'NEURAL-2026-ART3', 'locked', now() - interval '65 days', now() - interval '62 days'),
  ('e4040404-0404-0404-0404-040404040404', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Dream Team VR', 'user_emma_zhang_004', 'DREAM-2026-ART4', 'locked', now() - interval '65 days', now() - interval '60 days'),
  -- AI Agents Hackathon 2026 teams
  ('fa1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AutoPilot Crew', 'user_david_park_005', 'AUTO-2026-AGT1', 'locked', now() - interval '20 days', now() - interval '14 days'),
  ('fa2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Code Reviewers United', 'user_kevin_chen_006', 'CODE-2026-AGT2', 'locked', now() - interval '20 days', now() - interval '15 days'),
  ('fa3a3a3a-3a3a-3a3a-3a3a-3a3a3a3a3a3a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Research Collective', 'user_michelle_torres_007', 'RSRCH-2026-AGT3', 'locked', now() - interval '20 days', now() - interval '14 days'),
  ('fa4a4a4a-4a4a-4a4a-4a4a-4a4a4a4a4a4a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bug Hunters', 'user_ryan_obrien_008', 'DEBUG-2026-AGT4', 'locked', now() - interval '20 days', now() - interval '15 days'),
  -- Search & Discovery Hack teams
  ('fc1c1c1c-1c1c-1c1c-1c1c-1c1c1c1c1c1c', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Doc Searchers', 'user_alex_kumar_009', 'DOCS-2026-SRC1', 'locked', now() - interval '35 days', now() - interval '31 days'),
  ('fc2c2c2c-2c2c-2c2c-2c2c-2c2c2c2c2c2c', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Graph Explorers', 'user_sofia_rodriguez_010', 'GRAPH-2026-SRC2', 'locked', now() - interval '35 days', now() - interval '32 days'),
  ('fc3c3c3c-3c3c-3c3c-3c3c-3c3c3c3c3c3c', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Smart Shoppers', 'user_nina_patel_011', 'SHOP-2026-SRC3', 'locked', now() - interval '35 days', now() - interval '31 days'),
  ('fc4c4c4c-4c4c-4c4c-4c4c-4c4c4c4c4c4c', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Legal Eagles', 'user_hannah_white_012', 'LEGAL-2026-SRC4', 'locked', now() - interval '35 days', now() - interval '32 days')
ON CONFLICT (id) DO NOTHING;
