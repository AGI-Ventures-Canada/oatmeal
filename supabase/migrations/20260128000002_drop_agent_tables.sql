DROP TABLE IF EXISTS luma_webhook_events CASCADE;
DROP TABLE IF EXISTS luma_webhook_configs CASCADE;
DROP TABLE IF EXISTS inbound_emails CASCADE;
DROP TABLE IF EXISTS email_addresses CASCADE;
DROP TABLE IF EXISTS sandbox_sessions CASCADE;
DROP TABLE IF EXISTS agent_runs CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_agent_id_fkey;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_target_check;

DROP TYPE IF EXISTS agent_type;
DROP TYPE IF EXISTS agent_run_status;
DROP TYPE IF EXISTS trigger_type;
DROP TYPE IF EXISTS luma_event_type;
