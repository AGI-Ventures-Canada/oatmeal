CREATE OR REPLACE FUNCTION register_for_hackathon(
  p_hackathon_id UUID,
  p_clerk_user_id TEXT,
  p_team_name TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  participant_id UUID,
  team_id UUID,
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
  v_new_team_id UUID;
  v_invite_code TEXT;
  v_final_team_name TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT id, status, registration_opens_at, registration_closes_at, max_participants
  INTO v_hackathon
  FROM hackathons
  WHERE id = p_hackathon_id
  FOR UPDATE;

  IF v_hackathon IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'hackathon_not_found'::TEXT, 'Hackathon not found'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.status IN ('draft', 'archived') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'registration_not_open'::TEXT, 'Registration is not open'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.registration_opens_at IS NOT NULL AND v_hackathon.registration_closes_at IS NOT NULL THEN
    IF v_now < v_hackathon.registration_opens_at THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'registration_not_open'::TEXT, 'Registration has not opened yet'::TEXT;
      RETURN;
    END IF;
    IF v_now > v_hackathon.registration_closes_at THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'registration_closed'::TEXT, 'Registration has closed'::TEXT;
      RETURN;
    END IF;
  ELSIF v_hackathon.status NOT IN ('registration_open', 'active') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'registration_not_open'::TEXT, 'Registration is not open'::TEXT;
    RETURN;
  END IF;

  SELECT id INTO v_existing_registration
  FROM hackathon_participants
  WHERE hackathon_id = p_hackathon_id AND clerk_user_id = p_clerk_user_id;

  IF v_existing_registration IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'already_registered'::TEXT, 'Already registered for this hackathon'::TEXT;
    RETURN;
  END IF;

  IF v_hackathon.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_participant_count
    FROM hackathon_participants
    WHERE hackathon_id = p_hackathon_id AND role = 'participant';

    IF v_participant_count >= v_hackathon.max_participants THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'at_capacity'::TEXT, 'Event is at full capacity'::TEXT;
      RETURN;
    END IF;
  END IF;

  v_final_team_name := COALESCE(p_team_name, 'My Team');

  v_invite_code := encode(gen_random_bytes(6), 'hex');

  INSERT INTO teams (hackathon_id, name, captain_clerk_user_id, invite_code, status)
  VALUES (p_hackathon_id, v_final_team_name, p_clerk_user_id, v_invite_code, 'forming')
  RETURNING id INTO v_new_team_id;

  INSERT INTO hackathon_participants (hackathon_id, clerk_user_id, role, team_id)
  VALUES (p_hackathon_id, p_clerk_user_id, 'participant', v_new_team_id)
  RETURNING id INTO v_new_participant_id;

  RETURN QUERY SELECT TRUE, v_new_participant_id, v_new_team_id, NULL::TEXT, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_token TEXT,
  p_clerk_user_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  team_id UUID,
  hackathon_id UUID,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_hackathon RECORD;
  v_team RECORD;
  v_participant_id UUID;
  v_existing_participant RECORD;
  v_team_member_count INTEGER;
  v_current_team_member_count INTEGER;
  v_old_team_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT ti.*, t.hackathon_id as team_hackathon_id
  INTO v_invitation
  FROM team_invitations ti
  JOIN teams t ON t.id = ti.team_id
  WHERE ti.token = p_token
  FOR UPDATE OF ti;

  IF v_invitation IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'not_found'::TEXT, 'Invitation not found'::TEXT;
    RETURN;
  END IF;

  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'not_pending'::TEXT, 'Invitation is no longer pending'::TEXT;
    RETURN;
  END IF;

  IF v_invitation.expires_at < v_now THEN
    UPDATE team_invitations SET status = 'expired', updated_at = v_now WHERE id = v_invitation.id;
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'expired'::TEXT, 'Invitation has expired'::TEXT;
    RETURN;
  END IF;

  SELECT id, status, ends_at, max_team_size
  INTO v_hackathon
  FROM hackathons
  WHERE id = v_invitation.hackathon_id;

  IF v_hackathon.status IN ('completed', 'archived') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'hackathon_ended'::TEXT, 'Hackathon has ended'::TEXT;
    RETURN;
  END IF;

  SELECT id, status
  INTO v_team
  FROM teams
  WHERE id = v_invitation.team_id;

  IF v_team.status = 'locked' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'team_locked'::TEXT, 'Team is locked'::TEXT;
    RETURN;
  END IF;

  IF v_team.status = 'disbanded' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'team_disbanded'::TEXT, 'Team has been disbanded'::TEXT;
    RETURN;
  END IF;

  SELECT id, team_id INTO v_existing_participant
  FROM hackathon_participants
  WHERE hackathon_id = v_invitation.hackathon_id
    AND clerk_user_id = p_clerk_user_id;

  IF v_existing_participant.id IS NOT NULL THEN
    IF v_existing_participant.team_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_current_team_member_count
      FROM hackathon_participants
      WHERE team_id = v_existing_participant.team_id;

      IF v_current_team_member_count > 1 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'already_on_team'::TEXT, 'You are already on a team with other members for this hackathon'::TEXT;
        RETURN;
      END IF;

      v_old_team_id := v_existing_participant.team_id;
    END IF;

    v_participant_id := v_existing_participant.id;
  ELSE
    INSERT INTO hackathon_participants (hackathon_id, clerk_user_id, role)
    VALUES (v_invitation.hackathon_id, p_clerk_user_id, 'participant')
    RETURNING id INTO v_participant_id;
  END IF;

  SELECT COUNT(*) INTO v_team_member_count
  FROM hackathon_participants
  WHERE team_id = v_invitation.team_id;

  IF v_hackathon.max_team_size IS NOT NULL AND v_team_member_count >= v_hackathon.max_team_size THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'team_full'::TEXT, 'Team is at maximum capacity'::TEXT;
    RETURN;
  END IF;

  UPDATE hackathon_participants
  SET team_id = v_invitation.team_id
  WHERE id = v_participant_id;

  IF v_old_team_id IS NOT NULL THEN
    UPDATE teams
    SET status = 'disbanded', updated_at = v_now
    WHERE id = v_old_team_id;
  END IF;

  UPDATE team_invitations
  SET
    status = 'accepted',
    accepted_at = v_now,
    accepted_by_clerk_user_id = p_clerk_user_id,
    updated_at = v_now
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT TRUE, v_invitation.team_id, v_invitation.hackathon_id, NULL::TEXT, NULL::TEXT;
END;
$$;
