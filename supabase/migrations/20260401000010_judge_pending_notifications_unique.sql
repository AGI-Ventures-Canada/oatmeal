ALTER TABLE judge_pending_notifications
  ADD CONSTRAINT judge_pending_notifications_hackathon_participant_unique
  UNIQUE (hackathon_id, participant_id);
