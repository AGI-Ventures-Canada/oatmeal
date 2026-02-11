-- ============================================================================
-- SUBMISSIONS - AI AGENTS 2026 (completed)
-- 18 submissions (7 team + 11 solo), all 'submitted'
-- Depends on: hackathons, participants, teams
-- ============================================================================

INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  -- Team submissions
  ('30013001-3001-3001-3001-300130013001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20012001-2001-2001-2001-200120012001',
   'AgentOS', 'A modular operating system for orchestrating multi-agent workflows with automatic task decomposition and parallel execution.',
   'https://github.com/seed/agent-os', 'https://agent-os.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30023002-3002-3002-3002-300230023002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20022002-2002-2002-2002-200220022002',
   'DebugBot', 'An AI agent that reads stack traces, reproduces bugs in sandboxed environments, and proposes verified fixes with test cases.',
   'https://github.com/seed/debugbot', NULL, 'https://youtube.com/watch?v=seed_debugbot',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30033003-3003-3003-3003-300330033003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20032003-2003-2003-2003-200320032003',
   'MarketMind', 'Autonomous market research agent that monitors competitor activity, synthesizes reports, and surfaces actionable insights.',
   'https://github.com/seed/marketmind', 'https://marketmind.demo.dev', 'https://youtube.com/watch?v=seed_marketmind',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30043004-3004-3004-3004-300430043004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20042004-2004-2004-2004-200420042004',
   'SwarmDeploy', 'Multi-agent deployment system where specialized agents handle CI, testing, security scanning, and rollout coordination.',
   'https://github.com/seed/swarmdeploy', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30053005-3005-3005-3005-300530053005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20052005-2005-2005-2005-200520052005',
   'MeetingPilot', 'Agent that joins video calls, takes structured notes, extracts action items, and files follow-up tasks in project management tools.',
   'https://github.com/seed/meetingpilot', 'https://meetingpilot.demo.dev', 'https://youtube.com/watch?v=seed_meetingpilot',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30063006-3006-3006-3006-300630063006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20062006-2006-2006-2006-200620062006',
   'CodeReviewAgent', 'Automated pull request reviewer that identifies bugs, security issues, and style violations with inline suggestions.',
   'https://github.com/seed/codereview-agent', NULL, 'https://youtube.com/watch?v=seed_codereview',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30073007-3007-3007-3007-300730073007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, '20072007-2007-2007-2007-200720072007',
   'DataPipelineAgent', 'Self-healing ETL agent that monitors data pipelines, detects anomalies, and auto-remediates common failures.',
   'https://github.com/seed/datapipeline-agent', 'https://datapipeline.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  -- Solo submissions
  ('30083008-3008-3008-3008-300830083008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10181018-1018-1018-1018-101810181018', NULL,
   'ResearchRadar', 'Personal research assistant that monitors arXiv, filters papers by relevance, and generates weekly digest summaries.',
   'https://github.com/seed/research-radar', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30093009-3009-3009-3009-300930093009', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10191019-1019-1019-1019-101910191019', NULL,
   'PromptForge', 'Interactive prompt engineering workbench with version control, A/B testing, and automated evaluation metrics.',
   'https://github.com/seed/promptforge', 'https://promptforge.demo.dev', 'https://youtube.com/watch?v=seed_promptforge',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  -- Dev user submission (for testing Edit Submission flow)
  ('300a300a-300a-300a-300a-300a300a300a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', NULL,
   'TaskWeaver', 'An AI task orchestrator that breaks down complex goals into executable sub-tasks and coordinates multiple tool-use agents.',
   'https://github.com/seed/taskweaver', 'https://taskweaver.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  -- Additional solo submissions
  ('30293029-3029-3029-3029-302930293029', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10481048-1048-1048-1048-104810481048', NULL,
   'DocuAgent', 'AI agent that reads codebases, generates comprehensive documentation, and keeps docs in sync with code changes.',
   'https://github.com/seed/docuagent', 'https://docuagent.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302a302a-302a-302a-302a-302a302a302a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10491049-1049-1049-1049-104910491049', NULL,
   'InboxZero', 'Email triage agent that categorizes, summarizes, and drafts responses with configurable persona and priorities.',
   'https://github.com/seed/inboxzero', NULL, 'https://youtube.com/watch?v=seed_inboxzero',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302b302b-302b-302b-302b-302b302b302b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104a104a-104a-104a-104a-104a104a104a', NULL,
   'TravelPlanner AI', 'Trip planning agent that searches flights, hotels, and activities then builds optimized itineraries with budget tracking.',
   'https://github.com/seed/travelplanner', 'https://travelplanner.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302c302c-302c-302c-302c-302c302c302c', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104b104b-104b-104b-104b-104b104b104b', NULL,
   'SQLAgent', 'Natural language to SQL agent with schema understanding, query optimization, and result visualization.',
   'https://github.com/seed/sqlagent', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302d302d-302d-302d-302d-302d302d302d', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104c104c-104c-104c-104c-104c104c104c', NULL,
   'APIScout', 'Agent that discovers, tests, and integrates third-party APIs by reading documentation and generating client code.',
   'https://github.com/seed/apiscout', 'https://apiscout.demo.dev', 'https://youtube.com/watch?v=seed_apiscout',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302e302e-302e-302e-302e-302e302e302e', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104d104d-104d-104d-104d-104d104d104d', NULL,
   'HealthBot', 'Personal wellness agent that tracks habits, suggests exercises, and provides evidence-based nutrition guidance.',
   'https://github.com/seed/healthbot', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('302f302f-302f-302f-302f-302f302f302f', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104e104e-104e-104e-104e-104e104e104e', NULL,
   'ContractReview', 'Legal document analysis agent that highlights risks, missing clauses, and suggests standardized alternatives.',
   'https://github.com/seed/contractreview', 'https://contractreview.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days'),

  ('30303030-3030-3030-3030-303030303030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '104f104f-104f-104f-104f-104f104f104f', NULL,
   'GitAssist', 'Commit message and PR description generator that analyzes diffs and follows repository conventions.',
   'https://github.com/seed/gitassist', NULL, 'https://youtube.com/watch?v=seed_gitassist',
   'submitted', '{}'::jsonb, now() - interval '15 days', now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;
