-- Hackathon sub-phases within active/judging statuses
CREATE TYPE hackathon_phase AS ENUM (
  'build',
  'submission_open',
  'preliminaries',
  'finals',
  'results_pending'
);

ALTER TABLE hackathons
  ADD COLUMN phase hackathon_phase,
  ADD COLUMN challenge_title text,
  ADD COLUMN challenge_body text,
  ADD COLUMN challenge_released_at timestamptz;
