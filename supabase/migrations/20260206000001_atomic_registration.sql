CREATE OR REPLACE FUNCTION register_for_hackathon(
  p_hackathon_id UUID,
  p_clerk_user_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  participant_id UUID,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hackathon RECORD;
  v_participant_count INTEGER;
  v_existing_registration UUID;
  v_new_participant_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id, status, registration_opens_at, registration_closes_at, max_participants
  INTO v_hackathon
  FROM hackathons
  WHERE id = p_hackathon_id
  FOR UPDATE;

  IF v_hackathon IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'hackathon_not_found'::TEXT, 'Hackathon not found'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.status IN ('draft', 'archived') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'registration_not_open'::TEXT, 'Registration is not open'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.registration_opens_at IS NOT NULL AND v_hackathon.registration_closes_at IS NOT NULL THEN
    IF v_now < v_hackathon.registration_opens_at THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, 'registration_not_open'::TEXT, 'Registration has not opened yet'::TEXT;
      RETURN;
    END IF;
    IF v_now > v_hackathon.registration_closes_at THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, 'registration_closed'::TEXT, 'Registration has closed'::TEXT;
      RETURN;
    END IF;
  ELSIF v_hackathon.status NOT IN ('registration_open', 'active') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'registration_not_open'::TEXT, 'Registration is not open'::TEXT;
    RETURN;
  END IF;

  SELECT id INTO v_existing_registration
  FROM hackathon_participants
  WHERE hackathon_id = p_hackathon_id AND clerk_user_id = p_clerk_user_id;

  IF v_existing_registration IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'already_registered'::TEXT, 'Already registered for this hackathon'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_participant_count
    FROM hackathon_participants
    WHERE hackathon_id = p_hackathon_id AND role = 'participant';

    IF v_participant_count >= v_hackathon.max_participants THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, 'at_capacity'::TEXT, 'Event is at full capacity'::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO hackathon_participants (hackathon_id, clerk_user_id, role)
  VALUES (p_hackathon_id, p_clerk_user_id, 'participant')
  RETURNING id INTO v_new_participant_id;

  RETURN QUERY SELECT TRUE, v_new_participant_id, NULL::TEXT, NULL::TEXT;
END;
$$;
