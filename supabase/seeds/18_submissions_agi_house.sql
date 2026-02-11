-- ============================================================================
-- SUBMISSIONS - AGI HOUSE HACKATHONS (completed)
-- MCP Agents, GenAI Goes Local, Generative UI
-- Depends on: hackathons, participants, teams
-- ============================================================================

-- MCP Agents Hackathon (completed) — 5 team + 8 solo = 13 submissions
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('a9a00001-a9a0-a9a0-a9a0-a9a00001a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', NULL, 'a9f00001-a9f0-a9f0-a9f0-a9f00001a9f0',
   'MCP Gateway', 'Universal MCP server gateway that aggregates multiple tool servers behind a single endpoint with load balancing, caching, and access control. Supports hot-reloading server configs.',
   'https://github.com/seed/mcp-gateway', 'https://mcp-gateway.demo.dev', 'https://youtube.com/watch?v=seed_mcpgateway',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00002-a9a0-a9a0-a9a0-a9a00002a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', NULL, 'a9f00002-a9f0-a9f0-a9f0-a9f00002a9f0',
   'MCPilot', 'Autonomous coding agent that chains MCP tool servers for file editing, terminal commands, and browser testing to complete full development tasks from issue descriptions.',
   'https://github.com/seed/mcpilot', NULL, 'https://youtube.com/watch?v=seed_mcpilot',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00003-a9a0-a9a0-a9a0-a9a00003a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', NULL, 'a9f00003-a9f0-a9f0-a9f0-a9f00003a9f0',
   'DataBridge MCP', 'MCP server that connects LLMs to live database schemas, enabling natural language queries across Postgres, MySQL, and MongoDB with automatic SQL generation and result formatting.',
   'https://github.com/seed/databridge-mcp', 'https://databridge.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00004-a9a0-a9a0-a9a0-a9a00004a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', NULL, 'a9f00004-a9f0-a9f0-a9f0-a9f00004a9f0',
   'MCP Observatory', 'Real-time monitoring dashboard for MCP server fleets with request tracing, latency metrics, error tracking, and automatic anomaly detection across tool calls.',
   'https://github.com/seed/mcp-observatory', 'https://mcp-observatory.demo.dev', 'https://youtube.com/watch?v=seed_mcpobs',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00005-a9a0-a9a0-a9a0-a9a00005a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', NULL, 'a9f00005-a9f0-a9f0-a9f0-a9f00005a9f0',
   'MCP Marketplace', 'Community marketplace for discovering, sharing, and installing MCP tool servers with one-click setup, ratings, and compatibility checking.',
   'https://github.com/seed/mcp-marketplace', 'https://mcp-marketplace.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00006-a9a0-a9a0-a9a0-a9a00006a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e00011-a9e0-a9e0-a9e0-a9e00011a9e0', NULL,
   'MCP Debugger', 'Interactive debugger for MCP tool servers that lets you step through tool calls, inspect payloads, mock responses, and replay conversations for testing.',
   'https://github.com/seed/mcp-debugger', NULL, 'https://youtube.com/watch?v=seed_mcpdebug',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00007-a9a0-a9a0-a9a0-a9a00007a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e00012-a9e0-a9e0-a9e0-a9e00012a9e0', NULL,
   'GitMCP', 'MCP server that wraps git operations with semantic understanding — review PRs, resolve conflicts, generate changelogs, and manage releases through natural language.',
   'https://github.com/seed/gitmcp', 'https://gitmcp.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00008-a9a0-a9a0-a9a0-a9a00008a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e00013-a9e0-a9e0-a9e0-a9e00013a9e0', NULL,
   'BrowserMCP', 'Headless browser automation MCP server for web scraping, testing, and interaction with full JavaScript rendering and screenshot capture.',
   'https://github.com/seed/browsermcp', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a00009-a9a0-a9a0-a9a0-a9a00009a9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e00014-a9e0-a9e0-a9e0-a9e00014a9e0', NULL,
   'SlackMCP', 'MCP server for Slack workspace management — search messages, summarize channels, draft replies, and manage notifications through tool calls.',
   'https://github.com/seed/slackmcp', NULL, 'https://youtube.com/watch?v=seed_slackmcp',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a0000a-a9a0-a9a0-a9a0-a9a0000aa9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9d90001-a9d9-a9d9-a9d9-a9d90001a9d9', NULL,
   'MCP Compose', 'Docker-compose-style orchestration for MCP servers — define multi-server environments in YAML, manage dependencies, and spin up complete tool ecosystems.',
   'https://github.com/seed/mcp-compose', 'https://mcp-compose.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a0000b-a9a0-a9a0-a9a0-a9a0000ba9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e0000a-a9e0-a9e0-a9e0-a9e0000aa9e0', NULL,
   'CalendarMCP', 'MCP server for Google Calendar that schedules meetings, finds optimal times across attendees, and manages event conflicts with natural language.',
   'https://github.com/seed/calendarmcp', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a0000c-a9a0-a9a0-a9a0-a9a0000ca9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e0000d-a9e0-a9e0-a9e0-a9e0000da9e0', NULL,
   'DesignMCP', 'Figma-integrated MCP server that converts design tokens to code, generates component variations, and syncs design changes with code repositories.',
   'https://github.com/seed/designmcp', 'https://designmcp.demo.dev', 'https://youtube.com/watch?v=seed_designmcp',
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days'),

  ('a9a0000d-a9a0-a9a0-a9a0-a9a0000da9a0', 'aaa10001-aaa1-aaa1-aaa1-aaa10001aaa1', 'a9e00010-a9e0-a9e0-a9e0-a9e00010a9e0', NULL,
   'CICD-MCP', 'MCP server for CI/CD pipelines — trigger builds, check statuses, read logs, and manage deployments across GitHub Actions, GitLab CI, and Jenkins.',
   'https://github.com/seed/cicd-mcp', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '22 days', now() - interval '22 days')
ON CONFLICT (id) DO NOTHING;

-- GenAI Goes Local (completed) — 4 team + 6 solo = 10 submissions
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('a9a00010-a9a0-a9a0-a9a0-a9a00010a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', NULL, 'a9f00006-a9f0-a9f0-a9f0-a9f00006a9f0',
   'TinyChat', 'Fully offline chat assistant running quantized Llama 3 on consumer GPUs with 4-bit GPTQ, streaming responses under 200ms first-token latency on an RTX 3060.',
   'https://github.com/seed/tinychat', 'https://tinychat.demo.dev', 'https://youtube.com/watch?v=seed_tinychat',
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00011-a9a0-a9a0-a9a0-a9a00011a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', NULL, 'a9f00007-a9f0-a9f0-a9f0-a9f00007a9f0',
   'WhisperLocal', 'Real-time speech-to-text running Whisper on-device with speaker diarization, punctuation restoration, and live subtitle overlay for any application.',
   'https://github.com/seed/whisperlocal', NULL, 'https://youtube.com/watch?v=seed_whisperlocal',
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00012-a9a0-a9a0-a9a0-a9a00012a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', NULL, 'a9f00008-a9f0-a9f0-a9f0-a9f00008a9f0',
   'OfflineTranslate', 'Privacy-first translation app running NLLB-200 locally with support for 50+ languages, document batch processing, and a macOS menu bar interface.',
   'https://github.com/seed/offline-translate', 'https://offline-translate.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00013-a9a0-a9a0-a9a0-a9a00013a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', NULL, 'a9f00009-a9f0-a9f0-a9f0-a9f00009a9f0',
   'VisionEdge', 'On-device object detection and scene understanding pipeline using quantized YOLOv8 + CLIP for real-time camera analysis without cloud dependencies.',
   'https://github.com/seed/visionedge', NULL, 'https://youtube.com/watch?v=seed_visionedge',
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00014-a9a0-a9a0-a9a0-a9a00014a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9e00021-a9e0-a9e0-a9e0-a9e00021a9e0', NULL,
   'LocalRAG', 'Completely offline RAG pipeline with local embeddings, vector store, and inference — index documents and ask questions without any network access.',
   'https://github.com/seed/localrag', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00015-a9a0-a9a0-a9a0-a9a00015a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9e00022-a9e0-a9e0-a9e0-a9e00022a9e0', NULL,
   'CodeComplete Local', 'VS Code extension providing Copilot-style code completions using a local 7B parameter model with intelligent context windowing and 50ms latency.',
   'https://github.com/seed/codecomplete-local', NULL, 'https://youtube.com/watch?v=seed_codecomplete',
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00016-a9a0-a9a0-a9a0-a9a00016a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9e00023-a9e0-a9e0-a9e0-a9e00023a9e0', NULL,
   'MailSense', 'Local email classifier and summarizer that processes your inbox on-device, categorizes messages, and drafts responses without sending data to any cloud service.',
   'https://github.com/seed/mailsense', 'https://mailsense.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00017-a9a0-a9a0-a9a0-a9a00017a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9d90002-a9d9-a9d9-a9d9-a9d90002a9d9', NULL,
   'PhotoTag Local', 'On-device photo organizer using local vision models for auto-tagging, face clustering, and natural language photo search across your library.',
   'https://github.com/seed/phototag-local', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00018-a9a0-a9a0-a9a0-a9a00018a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9e0001e-a9e0-a9e0-a9e0-a9e0001ea9e0', NULL,
   'EdgeSummarizer', 'Browser extension that summarizes web pages, PDFs, and articles using a local language model — no data leaves your machine.',
   'https://github.com/seed/edge-summarizer', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days'),

  ('a9a00019-a9a0-a9a0-a9a0-a9a00019a9a0', 'aaa20002-aaa2-aaa2-aaa2-aaa20002aaa2', 'a9e00020-a9e0-a9e0-a9e0-a9e00020a9e0', NULL,
   'NotesMind', 'Local-first smart notes app with on-device semantic search, auto-linking between notes, and AI-generated summaries powered by a quantized Phi-3 model.',
   'https://github.com/seed/notesmind', 'https://notesmind.demo.dev', 'https://youtube.com/watch?v=seed_notesmind',
   'submitted', '{}'::jsonb, now() - interval '43 days', now() - interval '43 days')
ON CONFLICT (id) DO NOTHING;

-- Generative UI Hackathon (completed) — 5 team + 7 solo = 12 submissions
INSERT INTO submissions (id, hackathon_id, participant_id, team_id, title, description, github_url, live_app_url, demo_video_url, status, metadata, created_at, updated_at)
VALUES
  ('a9a00020-a9a0-a9a0-a9a0-a9a00020a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', NULL, 'a9f0000a-a9f0-a9f0-a9f0-a9f0000aa9f0',
   'UIForge', 'AI-powered design system that generates complete, accessible React component libraries from brand guidelines and wireframe sketches.',
   'https://github.com/seed/uiforge', 'https://uiforge.demo.dev', 'https://youtube.com/watch?v=seed_uiforge',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00021-a9a0-a9a0-a9a0-a9a00021a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', NULL, 'a9f0000b-a9f0-a9f0-a9f0-a9f0000ba9f0',
   'ChatUI Kit', 'Conversational interface framework where AI responses render as rich, interactive components — charts, forms, carousels, and maps instead of plain text.',
   'https://github.com/seed/chatui-kit', 'https://chatui-kit.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00022-a9a0-a9a0-a9a0-a9a00022a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', NULL, 'a9f0000c-a9f0-a9f0-a9f0-a9f0000ca9f0',
   'AdaptiveLayout', 'AI layout engine that dynamically rearranges page components based on user behavior, screen size, and content priority scores in real-time.',
   'https://github.com/seed/adaptive-layout', NULL, 'https://youtube.com/watch?v=seed_adaptlayout',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00023-a9a0-a9a0-a9a0-a9a00023a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', NULL, 'a9f0000d-a9f0-a9f0-a9f0-a9f0000da9f0',
   'FormGenius', 'Intelligent form builder that generates multi-step forms from natural language descriptions with validation rules, conditional logic, and accessibility baked in.',
   'https://github.com/seed/formgenius', 'https://formgenius.demo.dev', 'https://youtube.com/watch?v=seed_formgenius',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00024-a9a0-a9a0-a9a0-a9a00024a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', NULL, 'a9f0000e-a9f0-a9f0-a9f0-a9f0000ea9f0',
   'ThemeAlchemy', 'Real-time theming engine where users describe their preferred aesthetic in natural language and the AI generates complete design tokens, animations, and component variants.',
   'https://github.com/seed/theme-alchemy', 'https://themealchemy.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00025-a9a0-a9a0-a9a0-a9a00025a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00033-a9e0-a9e0-a9e0-a9e00033a9e0', NULL,
   'DashGen', 'Generates complete admin dashboards from database schemas — tables, charts, filters, and CRUD forms all created automatically with customizable templates.',
   'https://github.com/seed/dashgen', 'https://dashgen.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00026-a9a0-a9a0-a9a0-a9a00026a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00034-a9e0-a9e0-a9e0-a9e00034a9e0', NULL,
   'SketchToCode', 'Converts hand-drawn wireframe sketches to production-ready React and Tailwind components using vision models and code generation.',
   'https://github.com/seed/sketch-to-code', NULL, 'https://youtube.com/watch?v=seed_sketchcode',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00027-a9a0-a9a0-a9a0-a9a00027a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00035-a9e0-a9e0-a9e0-a9e00035a9e0', NULL,
   'EmailCraft', 'AI email template builder that generates responsive HTML emails from text descriptions with inline styles, dark mode support, and client compatibility testing.',
   'https://github.com/seed/emailcraft', 'https://emailcraft.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00028-a9a0-a9a0-a9a0-a9a00028a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00036-a9e0-a9e0-a9e0-a9e00036a9e0', NULL,
   'AnimateAI', 'CSS animation generator that creates complex keyframe animations, transitions, and micro-interactions from natural language descriptions.',
   'https://github.com/seed/animate-ai', NULL, 'https://youtube.com/watch?v=seed_animateai',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a00029-a9a0-a9a0-a9a0-a9a00029a9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00024-a9e0-a9e0-a9e0-a9e00024a9e0', NULL,
   'VoiceUI Builder', 'Generates voice-controlled interfaces — speak your intent and watch components assemble on screen with voice navigation, form filling, and accessibility.',
   'https://github.com/seed/voiceui-builder', 'https://voiceui.demo.dev', 'https://youtube.com/watch?v=seed_voiceui',
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a0002a-a9a0-a9a0-a9a0-a9a0002aa9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e0002e-a9e0-a9e0-a9e0-a9e0002ea9e0', NULL,
   'DataVizGen', 'Chart and data visualization generator that creates interactive D3.js visualizations from datasets and natural language descriptions of desired insights.',
   'https://github.com/seed/datavizgen', 'https://datavizgen.demo.dev', NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days'),

  ('a9a0002b-a9a0-a9a0-a9a0-a9a0002ba9a0', 'aaa30003-aaa3-aaa3-aaa3-aaa30003aaa3', 'a9e00030-a9e0-a9e0-a9e0-a9e00030a9e0', NULL,
   'LandingAI', 'One-prompt landing page generator that creates fully responsive marketing pages with hero sections, testimonials, pricing tables, and CTAs.',
   'https://github.com/seed/landingai', NULL, NULL,
   'submitted', '{}'::jsonb, now() - interval '64 days', now() - interval '64 days')
ON CONFLICT (id) DO NOTHING;
