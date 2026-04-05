-- Allow a judge to be assigned the same submission for different prizes.
-- Previously, the unique constraint was (judge, submission, round).
-- Now it includes prize_id so each prize gets its own assignments.

DROP INDEX IF EXISTS judge_assignments_unique_per_round;

CREATE UNIQUE INDEX judge_assignments_unique_per_prize
  ON judge_assignments(
    judge_participant_id,
    submission_id,
    COALESCE(prize_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(round_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
