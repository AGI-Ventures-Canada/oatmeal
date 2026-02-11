-- ============================================================================
-- SUBMISSIONS - PUBLISHED HACKATHONS (draft status)
-- Climate Tech, AI Safety Jam, AGI Innovation Summit
-- Depends on: hackathons, participants
-- ============================================================================

-- Climate Tech (published) — 4 submissions, all 'draft'
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('301e301e-301e-301e-301e-301e301e301e', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '103b103b-103b-103b-103b-103b103b103b', NULL,
   'CarbonLens', 'Supply chain carbon footprint analyzer using satellite imagery and shipping data to track emissions.',
   'https://github.com/seed/carbonlens', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '2 days', now() - interval '1 day'),

  ('301f301f-301f-301f-301f-301f301f301f', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '103c103c-103c-103c-103c-103c103c103c', NULL,
   'GridOptimizer', 'ML model for optimizing renewable energy grid distribution based on weather forecasts and demand patterns.',
   'https://github.com/seed/gridoptimizer', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '2 days', now() - interval '1 day'),

  ('30203020-3020-3020-3020-302030203020', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '103d103d-103d-103d-103d-103d103d103d', NULL,
   'WasteWise', 'Computer vision waste sorting assistant for municipalities with contamination detection and recycling optimization.',
   'https://github.com/seed/wastewise', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now() - interval '1 day'),

  ('30213021-3021-3021-3021-302130213021', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '103e103e-103e-103e-103e-103e103e103e', NULL,
   'EcoRoute', 'Carbon-aware route planner for logistics fleets that optimizes delivery paths for both speed and emissions.',
   'https://github.com/seed/ecoroute', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now())
ON CONFLICT (id) DO NOTHING;

-- AI Safety Jam (published) — 4 submissions, all 'draft'
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('30223022-3022-3022-3022-302230223022', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '103f103f-103f-103f-103f-103f103f103f', NULL,
   'HalluciGuard', 'Hallucination detection layer for LLM outputs using cross-referencing and confidence calibration.',
   'https://github.com/seed/halluciguard', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now()),

  ('30233023-3023-3023-3023-302330233023', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '10411041-1041-1041-1041-104110411041', NULL,
   'BiasAudit', 'Automated fairness testing framework that probes LLMs for demographic bias across multiple dimensions.',
   'https://github.com/seed/biasaudit', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now()),

  ('30243024-3024-3024-3024-302430243024', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '10421042-1042-1042-1042-104210421042', NULL,
   'SafePrompt', 'Prompt injection detection and sanitization library for production LLM applications.',
   'https://github.com/seed/safeprompt', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now()),

  ('30253025-3025-3025-3025-302530253025', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '10431043-1043-1043-1043-104310431043', NULL,
   'AlignBench', 'Benchmark suite for evaluating AI alignment across instruction following, refusal, and value consistency.',
   'https://github.com/seed/alignbench', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now())
ON CONFLICT (id) DO NOTHING;

-- AGI Innovation Summit (published) — 3 submissions, all 'draft'
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('30263026-3026-3026-3026-302630263026', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '10441044-1044-1044-1044-104410441044', NULL,
   'ReasonChain', 'Multi-step reasoning framework that chains specialized models for complex problem decomposition.',
   'https://github.com/seed/reasonchain', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now()),

  ('30273027-3027-3027-3027-302730273027', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '10451045-1045-1045-1045-104510451045', NULL,
   'MemoryGraph', 'Long-term memory system for LLMs using dynamic knowledge graphs with episodic and semantic memory layers.',
   'https://github.com/seed/memorygraph', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now()),

  ('30283028-3028-3028-3028-302830283028', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '10461046-1046-1046-1046-104610461046', NULL,
   'WorldSim', 'Lightweight world model simulator for testing agent decision-making in procedurally generated environments.',
   'https://github.com/seed/worldsim', NULL, NULL,
   'draft', '{}'::jsonb, now() - interval '1 day', now())
ON CONFLICT (id) DO NOTHING;
