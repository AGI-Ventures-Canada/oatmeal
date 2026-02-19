-- Enable pg_cron for scheduled status transitions
CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO postgres;

-- Function to automatically transition hackathon statuses based on timeline dates
CREATE OR REPLACE FUNCTION transition_hackathon_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- published or registration_open → active when starts_at has passed (and not yet ended)
  UPDATE hackathons
  SET status = 'active', updated_at = now()
  WHERE status IN ('published', 'registration_open')
    AND starts_at IS NOT NULL
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now());

  -- active → completed when ends_at has passed
  -- 'judging' is set manually by the organizer and is not touched here
  UPDATE hackathons
  SET status = 'completed', updated_at = now()
  WHERE status = 'active'
    AND ends_at IS NOT NULL
    AND ends_at <= now();
END;
$$;

-- Remove existing schedule if any before creating
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hackathon-status-transitions') THEN
    PERFORM cron.unschedule('hackathon-status-transitions');
  END IF;
END;
$$;

-- Schedule to run every minute
SELECT cron.schedule(
  'hackathon-status-transitions',
  '* * * * *',
  'SELECT transition_hackathon_statuses()'
);
