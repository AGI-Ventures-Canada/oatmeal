CREATE OR REPLACE FUNCTION calculate_round_results(p_hackathon_id UUID, p_round_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  results_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hackathon RECORD;
  v_round RECORD;
  v_count INTEGER;
BEGIN
  SELECT id, status
  INTO v_hackathon
  FROM hackathons
  WHERE id = p_hackathon_id;

  IF v_hackathon IS NULL THEN
    RETURN QUERY SELECT FALSE, 'hackathon_not_found'::TEXT, 'Hackathon not found'::TEXT, 0;
    RETURN;
  END IF;

  IF v_hackathon.status NOT IN ('judging', 'completed') THEN
    RETURN QUERY SELECT FALSE, 'invalid_status'::TEXT, 'Hackathon must be in judging or completed status'::TEXT, 0;
    RETURN;
  END IF;

  SELECT id, hackathon_id
  INTO v_round
  FROM judging_rounds
  WHERE id = p_round_id AND hackathon_id = p_hackathon_id;

  IF v_round IS NULL THEN
    RETURN QUERY SELECT FALSE, 'round_not_found'::TEXT, 'Judging round not found'::TEXT, 0;
    RETURN;
  END IF;

  DELETE FROM hackathon_results
  WHERE hackathon_id = p_hackathon_id AND round_id = p_round_id;

  WITH scored_submissions AS (
    SELECT
      ja.submission_id,
      COUNT(DISTINCT ja.id) AS judge_count,
      SUM(s.score) AS total_score,
      SUM(s.score::numeric * jc.weight) / NULLIF(SUM(jc.weight), 0) AS weighted_score
    FROM judge_assignments ja
    JOIN scores s ON s.judge_assignment_id = ja.id
    JOIN judging_criteria jc ON jc.id = s.criteria_id
    WHERE ja.hackathon_id = p_hackathon_id
      AND ja.round_id = p_round_id
      AND ja.is_complete = true
    GROUP BY ja.submission_id
  ),
  ranked AS (
    SELECT
      submission_id,
      judge_count,
      total_score,
      weighted_score,
      DENSE_RANK() OVER (ORDER BY weighted_score DESC) AS rank
    FROM scored_submissions
  )
  INSERT INTO hackathon_results (hackathon_id, submission_id, rank, total_score, weighted_score, judge_count, round_id)
  SELECT p_hackathon_id, submission_id, rank, total_score, weighted_score, judge_count, p_round_id
  FROM ranked;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_count;
END;
$$;
