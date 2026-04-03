-- Post-event notifications: results broadcast, feedback surveys, prize fulfillment, reminders

-- Track when results announcement was broadcast to all participants
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS results_announcement_sent_at timestamptz;

-- Track feedback survey state
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS feedback_survey_sent_at timestamptz;
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS feedback_survey_url text;

-- Prize fulfillment tracking
CREATE TYPE prize_fulfillment_status AS ENUM ('assigned', 'contacted', 'shipped', 'claimed');

CREATE TABLE IF NOT EXISTS prize_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_assignment_id uuid NOT NULL REFERENCES prize_assignments(id) ON DELETE CASCADE,
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  status prize_fulfillment_status NOT NULL DEFAULT 'assigned',
  recipient_email text,
  recipient_name text,
  shipping_address text,
  tracking_number text,
  notes text,
  contacted_at timestamptz,
  shipped_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prize_assignment_id)
);

CREATE INDEX idx_prize_fulfillments_hackathon ON prize_fulfillments(hackathon_id);
CREATE INDEX idx_prize_fulfillments_status ON prize_fulfillments(hackathon_id, status);

ALTER TABLE prize_fulfillments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to prize_fulfillments" ON prize_fulfillments FOR ALL USING (false);

-- Post-event reminders
CREATE TABLE IF NOT EXISTS post_event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  cancelled_at timestamptz,
  recipient_filter text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, type)
);

CREATE INDEX idx_post_event_reminders_pending
  ON post_event_reminders(scheduled_for)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX idx_post_event_reminders_hackathon ON post_event_reminders(hackathon_id);

ALTER TABLE post_event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to post_event_reminders" ON post_event_reminders FOR ALL USING (false);
