CREATE INDEX judge_pending_notifications_hackathon_email_unsent_idx
  ON judge_pending_notifications (hackathon_id, email)
  WHERE sent_at IS NULL;
