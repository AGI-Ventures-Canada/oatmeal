CREATE TABLE judge_pending_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  email text NOT NULL,
  added_by_name text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_pending_notifications_hackathon_participant_unique UNIQUE (hackathon_id, participant_id)
);

CREATE INDEX judge_pending_notifications_hackathon_unsent_idx
  ON judge_pending_notifications (hackathon_id)
  WHERE sent_at IS NULL;
