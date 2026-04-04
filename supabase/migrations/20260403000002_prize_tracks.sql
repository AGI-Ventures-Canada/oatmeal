-- Prize Tracks Architecture (Phase 1)
--
-- Introduces prize tracks as the unit of judging. Each hackathon can have
-- multiple prize tracks (Grand Prize, Sponsor Prize, People's Choice, etc.),
-- each with its own judging style, criteria, judges, and results.
--
-- Phase 1 supports: Bucket Sort (default), Gate Check (binary pass/fail).
-- Legacy modes (points, subjective, rubric) remain functional.

-- Enum: how judges evaluate within a round
CREATE TYPE judging_style AS ENUM (
  'bucket_sort',
  'gate_check',
  'head_to_head',
  'top_n',
  'compliance',
  'crowd',
  'points',
  'subjective'
);

-- Enum: round lifecycle
CREATE TYPE round_status AS ENUM ('planned', 'active', 'complete', 'advanced');

-- Enum: how submissions advance between rounds
CREATE TYPE advancement_rule AS ENUM ('top_n', 'threshold', 'manual');

-- Enum: organizer-facing intent when creating a track
CREATE TYPE track_intent AS ENUM (
  'overall_winner',
  'sponsor_prize',
  'crowd_favorite',
  'quick_comparison',
  'custom'
);

-- ============================================================
-- Prize Tracks
-- ============================================================

CREATE TABLE IF NOT EXISTS prize_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  intent track_intent NOT NULL DEFAULT 'custom',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prize_tracks_hackathon ON prize_tracks(hackathon_id);

ALTER TABLE prize_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to prize_tracks" ON prize_tracks FOR ALL USING (false);

-- ============================================================
-- Extend judging_rounds for prize track architecture
-- ============================================================

-- Drop the restrictive round_type CHECK so rounds can have any label
ALTER TABLE judging_rounds DROP CONSTRAINT IF EXISTS judging_rounds_round_type_check;

ALTER TABLE judging_rounds
  ADD COLUMN IF NOT EXISTS prize_track_id uuid REFERENCES prize_tracks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS style judging_style,
  ADD COLUMN IF NOT EXISTS status round_status NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS advancement advancement_rule NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS advancement_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow round_type to be nullable for new-style rounds
ALTER TABLE judging_rounds ALTER COLUMN round_type DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_judging_rounds_prize_track ON judging_rounds(prize_track_id) WHERE prize_track_id IS NOT NULL;

-- ============================================================
-- Link prizes to prize tracks
-- ============================================================

ALTER TABLE prizes
  ADD COLUMN IF NOT EXISTS prize_track_id uuid REFERENCES prize_tracks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prizes_prize_track ON prizes(prize_track_id) WHERE prize_track_id IS NOT NULL;

-- ============================================================
-- Bucket Definitions: category options for bucket sort rounds
-- ============================================================

CREATE TABLE IF NOT EXISTS bucket_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES judging_rounds(id) ON DELETE CASCADE,
  level integer NOT NULL,
  label text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(round_id, level)
);

CREATE INDEX idx_bucket_definitions_round ON bucket_definitions(round_id);

ALTER TABLE bucket_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to bucket_definitions" ON bucket_definitions FOR ALL USING (false);

-- ============================================================
-- Bucket Responses: judge places a submission into a bucket
-- One bucket selection per assignment (one per judge+submission)
-- ============================================================

CREATE TABLE IF NOT EXISTS bucket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_assignment_id uuid NOT NULL REFERENCES judge_assignments(id) ON DELETE CASCADE,
  bucket_id uuid NOT NULL REFERENCES bucket_definitions(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(judge_assignment_id)
);

CREATE INDEX idx_bucket_responses_assignment ON bucket_responses(judge_assignment_id);
CREATE INDEX idx_bucket_responses_bucket ON bucket_responses(bucket_id);

ALTER TABLE bucket_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to bucket_responses" ON bucket_responses FOR ALL USING (false);

-- ============================================================
-- Binary Responses: judge answers yes/no per gate criterion
-- Used by gate_check rounds and gate criteria in bucket_sort rounds
-- ============================================================

CREATE TABLE IF NOT EXISTS binary_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_assignment_id uuid NOT NULL REFERENCES judge_assignments(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
  passed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(judge_assignment_id, criteria_id)
);

CREATE INDEX idx_binary_responses_assignment ON binary_responses(judge_assignment_id);
CREATE INDEX idx_binary_responses_criteria ON binary_responses(criteria_id);

ALTER TABLE binary_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to binary_responses" ON binary_responses FOR ALL USING (false);

-- ============================================================
-- Track-level results
-- ============================================================

ALTER TABLE hackathon_results
  ADD COLUMN IF NOT EXISTS prize_track_id uuid REFERENCES prize_tracks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hackathon_results_prize_track ON hackathon_results(prize_track_id) WHERE prize_track_id IS NOT NULL;

-- Update unique constraints to support multiple tracks per submission.
-- A submission can have results in Grand Prize AND Sponsor Prize tracks.
ALTER TABLE hackathon_results
  DROP CONSTRAINT IF EXISTS hackathon_results_hackathon_id_submission_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_results_legacy_unique
  ON hackathon_results(hackathon_id, submission_id)
  WHERE prize_track_id IS NULL AND round_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_results_track_unique
  ON hackathon_results(prize_track_id, submission_id, COALESCE(round_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE prize_track_id IS NOT NULL;

-- ============================================================
-- Update judge_assignments uniqueness for multi-track support
-- A judge can be assigned the same submission in different tracks/rounds
-- ============================================================

ALTER TABLE judge_assignments
  DROP CONSTRAINT IF EXISTS judge_assignments_judge_participant_id_submission_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS judge_assignments_unique_per_round
  ON judge_assignments(
    judge_participant_id,
    submission_id,
    COALESCE(round_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
