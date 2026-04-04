CREATE OR REPLACE FUNCTION submit_scores(
  p_judge_assignment_id UUID,
  p_scores JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_hackathon RECORD;
  v_score_entry RECORD;
  v_criteria RECORD;
  v_max_level INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT ja.*, hp.clerk_user_id
  INTO v_assignment
  FROM judge_assignments ja
  JOIN hackathon_participants hp ON hp.id = ja.judge_participant_id
  WHERE ja.id = p_judge_assignment_id
  FOR UPDATE OF ja;

  IF v_assignment IS NULL THEN
    RETURN QUERY SELECT FALSE, 'assignment_not_found'::TEXT, 'Judge assignment not found'::TEXT;
    RETURN;
  END IF;

  SELECT id, status, judging_mode
  INTO v_hackathon
  FROM hackathons
  WHERE id = v_assignment.hackathon_id;

  IF v_hackathon.status != 'judging' AND v_hackathon.status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'not_judging'::TEXT, 'Hackathon is not in judging phase'::TEXT;
    RETURN;
  END IF;

  FOR v_score_entry IN SELECT * FROM jsonb_to_recordset(p_scores) AS x(criteria_id UUID, score INTEGER)
  LOOP
    SELECT id, max_score, hackathon_id
    INTO v_criteria
    FROM judging_criteria
    WHERE id = v_score_entry.criteria_id;

    IF v_criteria IS NULL THEN
      RETURN QUERY SELECT FALSE, 'criteria_not_found'::TEXT, ('Criteria not found: ' || v_score_entry.criteria_id::TEXT)::TEXT;
      RETURN;
    END IF;

    IF v_criteria.hackathon_id != v_assignment.hackathon_id THEN
      RETURN QUERY SELECT FALSE, 'criteria_mismatch'::TEXT, 'Criteria does not belong to this hackathon'::TEXT;
      RETURN;
    END IF;

    IF v_hackathon.judging_mode = 'rubric' THEN
      SELECT MAX(level_number) INTO v_max_level
      FROM rubric_levels WHERE criteria_id = v_score_entry.criteria_id;

      IF v_score_entry.score < 1 OR v_score_entry.score > COALESCE(v_max_level, 5) THEN
        RETURN QUERY SELECT FALSE, 'score_out_of_range'::TEXT,
          ('Score must be between 1 and ' || COALESCE(v_max_level, 5)::TEXT)::TEXT;
        RETURN;
      END IF;
    ELSE
      IF v_score_entry.score < 0 OR v_score_entry.score > v_criteria.max_score THEN
        RETURN QUERY SELECT FALSE, 'score_out_of_range'::TEXT,
          ('Score must be between 0 and ' || v_criteria.max_score::TEXT)::TEXT;
        RETURN;
      END IF;
    END IF;

    INSERT INTO scores (judge_assignment_id, criteria_id, score)
    VALUES (p_judge_assignment_id, v_score_entry.criteria_id, v_score_entry.score)
    ON CONFLICT (judge_assignment_id, criteria_id)
    DO UPDATE SET score = EXCLUDED.score, updated_at = v_now;
  END LOOP;

  UPDATE judge_assignments
  SET
    is_complete = true,
    completed_at = v_now,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_judge_assignment_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_results(p_hackathon_id UUID)
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
  v_count INTEGER;
  v_max_possible NUMERIC;
BEGIN
  SELECT id, status, judging_mode
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

  DELETE FROM hackathon_results WHERE hackathon_id = p_hackathon_id;

  IF v_hackathon.judging_mode = 'rubric' THEN
    SELECT SUM(
      max_level * CASE WHEN jc.category = 'core' THEN 2 ELSE 1 END
    )
    INTO v_max_possible
    FROM judging_criteria jc
    JOIN (
      SELECT criteria_id, MAX(level_number) AS max_level
      FROM rubric_levels
      GROUP BY criteria_id
    ) rl ON rl.criteria_id = jc.id
    WHERE jc.hackathon_id = p_hackathon_id;

    WITH scored_submissions AS (
      SELECT
        ja.submission_id,
        COUNT(DISTINCT ja.id) AS judge_count,
        SUM(s.score * CASE WHEN jc.category = 'core' THEN 2 ELSE 1 END) AS total_score
      FROM judge_assignments ja
      JOIN scores s ON s.judge_assignment_id = ja.id
      JOIN judging_criteria jc ON jc.id = s.criteria_id
      WHERE ja.hackathon_id = p_hackathon_id
        AND ja.is_complete = true
      GROUP BY ja.submission_id
    ),
    top_level_counts AS (
      SELECT
        ja.submission_id,
        COUNT(*) AS top_scores
      FROM scores s
      JOIN judge_assignments ja ON ja.id = s.judge_assignment_id
      JOIN (
        SELECT criteria_id, MAX(level_number) AS max_level
        FROM rubric_levels
        GROUP BY criteria_id
      ) rl ON rl.criteria_id = s.criteria_id
      WHERE ja.hackathon_id = p_hackathon_id
        AND ja.is_complete = true
        AND s.score = rl.max_level
      GROUP BY ja.submission_id
    ),
    ranked AS (
      SELECT
        ss.submission_id,
        ss.judge_count,
        ss.total_score,
        CASE
          WHEN v_max_possible > 0 AND ss.judge_count > 0
          THEN (ss.total_score::numeric / (v_max_possible * ss.judge_count) * 100)
          ELSE 0
        END AS weighted_score,
        DENSE_RANK() OVER (
          ORDER BY (ss.total_score::numeric / NULLIF(ss.judge_count, 0)) DESC, COALESCE(tlc.top_scores, 0) DESC
        ) AS rank
      FROM scored_submissions ss
      LEFT JOIN top_level_counts tlc ON tlc.submission_id = ss.submission_id
    )
    INSERT INTO hackathon_results (hackathon_id, submission_id, rank, total_score, weighted_score, judge_count)
    SELECT p_hackathon_id, submission_id, rank, total_score, weighted_score, judge_count
    FROM ranked;

  ELSE
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
    INSERT INTO hackathon_results (hackathon_id, submission_id, rank, total_score, weighted_score, judge_count)
    SELECT p_hackathon_id, submission_id, rank, total_score, weighted_score, judge_count
    FROM ranked;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_count;
END;
$$;
