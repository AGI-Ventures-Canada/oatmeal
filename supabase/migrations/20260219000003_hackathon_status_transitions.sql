-- Status transitions are computed at the application layer via getEffectiveStatus.
-- No pg_cron required - avoids Supabase Pro plan dependency.

-- Clean up cron job if this migration was previously applied with pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hackathon-status-transitions') THEN
      PERFORM cron.unschedule('hackathon-status-transitions');
    END IF;
  END IF;
END;
$$;

-- Stable SQL function for computing effective hackathon status.
-- Mirrors the logic in lib/utils/timeline.ts getEffectiveStatus.
-- Useful for ad-hoc SQL queries and debugging.
CREATE OR REPLACE FUNCTION effective_hackathon_status(
  status hackathon_status,
  starts_at timestamptz,
  ends_at timestamptz
) RETURNS hackathon_status
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN status IN ('draft', 'archived') THEN status
    WHEN ends_at IS NOT NULL AND ends_at <= now() AND status = 'judging' THEN 'judging'::hackathon_status
    WHEN ends_at IS NOT NULL AND ends_at <= now() THEN 'completed'::hackathon_status
    WHEN starts_at IS NOT NULL AND starts_at <= now() THEN 'active'::hackathon_status
    ELSE status
  END
$$;
