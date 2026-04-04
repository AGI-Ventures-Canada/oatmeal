-- Transition log: immutable record of every status change (manual or auto)
-- Used for idempotency (prevent double-firing from cron) and debugging
CREATE TABLE IF NOT EXISTS hackathon_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('manual', 'auto')),
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hackathon_transitions_lookup
  ON hackathon_transitions(hackathon_id, to_status, created_at DESC);

ALTER TABLE hackathon_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON hackathon_transitions FOR ALL USING (false);

-- Per-hackathon notification preferences (defaults all-true via column defaults)
CREATE TABLE IF NOT EXISTS hackathon_notification_settings (
  hackathon_id uuid PRIMARY KEY REFERENCES hackathons(id) ON DELETE CASCADE,
  email_on_registration_open boolean NOT NULL DEFAULT true,
  email_on_hackathon_active boolean NOT NULL DEFAULT true,
  email_on_judging_started boolean NOT NULL DEFAULT true,
  email_on_results_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hackathon_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON hackathon_notification_settings FOR ALL USING (false);

-- Extend webhook_event enum with transition-specific events
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'hackathon.registration_opened';
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'hackathon.started';
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'hackathon.judging_started';
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'hackathon.completed';
