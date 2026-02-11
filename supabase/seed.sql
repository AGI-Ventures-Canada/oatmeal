-- ============================================================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- This file runs automatically on `supabase db reset` and for preview branches
-- ============================================================================
--
-- Seed files are organized in the `seeds/` directory and numbered to ensure
-- proper ordering based on foreign key dependencies:
--
--   01_tenants.sql              - Base tenants (orgs and users)
--   02_api_keys_and_audit.sql   - API keys and audit logs
--   03_hackathons_demo.sql      - Demo org hackathons
--   04_hackathons_agi_ventures.sql - AGI Ventures Canada hackathons
--   05_hackathons_agi_house.sql - AGI House hackathons
--   06_hackathons_other_orgs.sql - Other organizations' hackathons
--   07_sponsors.sql             - Hackathon sponsors
--   08_participants_dev_user.sql - Dev user registrations
--   09_participants_seed.sql    - Seed participant data
--   10_participants_agi_house.sql - AGI House participants
--   11_teams.sql                - Teams
--   12_teams_agi_house.sql      - AGI House teams
--   13_team_assignments.sql     - Team member assignments
--   14_submissions_ai_agents.sql - AI Agents hackathon submissions
--   15_submissions_search.sql   - Search & Discovery submissions
--   16_submissions_ai_art.sql   - AI Art submissions
--   17_submissions_published.sql - Published hackathon drafts
--   18_submissions_agi_house.sql - AGI House submissions
--   19_submissions_projects.sql - Detailed project submissions
--
-- ============================================================================

-- Include all seed files in dependency order
\ir seeds/01_tenants.sql
\ir seeds/02_api_keys_and_audit.sql
\ir seeds/03_hackathons_demo.sql
\ir seeds/04_hackathons_agi_ventures.sql
\ir seeds/05_hackathons_agi_house.sql
\ir seeds/06_hackathons_other_orgs.sql
\ir seeds/07_sponsors.sql
\ir seeds/08_participants_dev_user.sql
\ir seeds/09_participants_seed.sql
\ir seeds/10_participants_agi_house.sql
\ir seeds/11_teams.sql
\ir seeds/12_teams_agi_house.sql
\ir seeds/13_team_assignments.sql
\ir seeds/14_submissions_ai_agents.sql
\ir seeds/15_submissions_search.sql
\ir seeds/16_submissions_ai_art.sql
\ir seeds/17_submissions_published.sql
\ir seeds/18_submissions_agi_house.sql
\ir seeds/19_submissions_projects.sql
