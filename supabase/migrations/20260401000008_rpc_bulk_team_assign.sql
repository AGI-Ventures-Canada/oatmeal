CREATE OR REPLACE FUNCTION bulk_assign_teams(p_hackathon_id UUID, p_assignments JSONB)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  assigned_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hackathon RECORD;
  v_entry RECORD;
  v_count INTEGER := 0;
  v_rows INTEGER;
BEGIN
  SELECT id
  INTO v_hackathon
  FROM hackathons
  WHERE id = p_hackathon_id;

  IF v_hackathon IS NULL THEN
    RETURN QUERY SELECT FALSE, 'hackathon_not_found'::TEXT, 'Hackathon not found'::TEXT, 0;
    RETURN;
  END IF;

  FOR v_entry IN
    SELECT
      (elem->>'teamId')::uuid AS team_id,
      (elem->>'roomId')::uuid AS room_id
    FROM jsonb_array_elements(p_assignments) AS elem
  LOOP
    INSERT INTO room_teams (room_id, team_id)
    VALUES (v_entry.room_id, v_entry.team_id)
    ON CONFLICT (room_id, team_id) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END LOOP;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_count;
END;
$$;
