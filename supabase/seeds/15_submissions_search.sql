-- ============================================================================
-- SUBMISSIONS - SEARCH & DISCOVERY (completed)
-- 15 submissions (4 team + 11 solo), all 'submitted'
-- Depends on: hackathons, participants, teams
-- ============================================================================

INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  -- Team submissions
  ('300b300b-300b-300b-300b-300b300b300b', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '20082008-2008-2008-2008-200820082008',
   'SemanticExplorer', 'Visual knowledge graph explorer with natural language queries, powered by Tavily search and embedding-based clustering.',
   'https://github.com/seed/semantic-explorer', 'https://semantic-explorer.demo.dev', 'https://youtube.com/watch?v=seed_semexplore',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('300c300c-300c-300c-300c-300c300c300c', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '20092009-2009-2009-2009-200920092009',
   'ContextFinder', 'Developer documentation search that understands code context and returns relevant examples from across multiple frameworks.',
   'https://github.com/seed/contextfinder', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('300d300d-300d-300d-300d-300d300d300d', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '200a200a-200a-200a-200a-200a200a200a',
   'NewsDigest AI', 'Real-time news aggregator that clusters stories by topic, identifies primary sources, and detects narrative bias.',
   'https://github.com/seed/newsdigest-ai', 'https://newsdigest.demo.dev', 'https://youtube.com/watch?v=seed_newsdigest',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('300e300e-300e-300e-300e-300e300e300e', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '200b200b-200b-200b-200b-200b200b200b',
   'PatentScout', 'Patent prior-art search tool that matches inventions to existing patents using semantic similarity and citation graph analysis.',
   'https://github.com/seed/patentscout', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  -- Solo submissions
  ('300f300f-300f-300f-300f-300f300f300f', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10251025-1025-1025-1025-102510251025', NULL,
   'RecipeSearch', 'Ingredient-aware recipe finder that suggests meals based on what you have, dietary restrictions, and cooking skill level.',
   'https://github.com/seed/recipesearch', 'https://recipesearch.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30103010-3010-3010-3010-301030103010', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10261026-1026-1026-1026-102610261026', NULL,
   'LegalSearch', 'Case law search engine using semantic embedding and citation network analysis to find relevant legal precedents.',
   'https://github.com/seed/legalsearch', NULL, 'https://youtube.com/watch?v=seed_legalsearch',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30113011-3011-3011-3011-301130113011', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10271027-1027-1027-1027-102710271027', NULL,
   'CodebaseNavigator', 'Semantic code search across polyglot repositories with natural language queries and dependency-aware ranking.',
   'https://github.com/seed/codebase-navigator', 'https://codenav.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30123012-3012-3012-3012-301230123012', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10281028-1028-1028-1028-102810281028', NULL,
   'PaperTrail', 'Academic paper recommendation engine with citation-aware search and collaborative filtering across research domains.',
   'https://github.com/seed/papertrail', NULL, 'https://youtube.com/watch?v=seed_papertrail',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  -- Additional solo submissions
  ('30313031-3031-3031-3031-303130313031', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10501050-1050-1050-1050-105010501050', NULL,
   'ProductHunt AI', 'Product discovery engine that matches user needs to tools and SaaS products using semantic similarity and reviews.',
   'https://github.com/seed/producthunt-ai', 'https://producthunt-ai.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30323032-3032-3032-3032-303230323032', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10511051-1051-1051-1051-105110511051', NULL,
   'TalentMatch', 'Resume-to-job matching engine using skill extraction, experience weighting, and culture-fit scoring.',
   'https://github.com/seed/talentmatch', NULL, 'https://youtube.com/watch?v=seed_talentmatch',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30333033-3033-3033-3033-303330333033', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10521052-1052-1052-1052-105210521052', NULL,
   'MusicDiscover', 'Music recommendation engine that understands mood, activity context, and listening history to suggest tracks.',
   'https://github.com/seed/musicdiscover', 'https://musicdiscover.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30343034-3034-3034-3034-303430343034', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10531053-1053-1053-1053-105310531053', NULL,
   'StackOverflow++', 'Enhanced code Q&A search that synthesizes answers from multiple sources and validates code snippets.',
   'https://github.com/seed/stackoverflow-plus', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30353035-3035-3035-3035-303530353035', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10541054-1054-1054-1054-105410541054', NULL,
   'EventRadar', 'Local event discovery platform using NLP to extract events from social media, newsletters, and community boards.',
   'https://github.com/seed/eventradar', 'https://eventradar.demo.dev', 'https://youtube.com/watch?v=seed_eventradar',
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days'),

  ('30363036-3036-3036-3036-303630363036', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '10551055-1055-1055-1055-105510551055', NULL,
   'DatasetFinder', 'ML dataset search engine that matches research questions to relevant open datasets with quality and recency scoring.',
   'https://github.com/seed/datasetfinder', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '32 days', now() - interval '31 days')
ON CONFLICT (id) DO NOTHING;
