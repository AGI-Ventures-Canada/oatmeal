CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at bigint NOT NULL DEFAULT 0
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to rate_limits" ON rate_limits FOR ALL USING (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_now bigint;
  v_reset_at bigint;
  v_count integer;
BEGIN
  v_now := (extract(epoch from clock_timestamp()) * 1000)::bigint;

  SELECT count, reset_at INTO v_count, v_reset_at
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND OR v_now >= v_reset_at THEN
    v_reset_at := v_now + p_window_ms;
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_reset_at)
    ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = v_reset_at;
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_reset_at
    );
  END IF;

  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_reset_at
    );
  END IF;

  UPDATE rate_limits SET count = v_count + 1 WHERE key = p_key;

  RETURN jsonb_build_object(
    'allowed', v_count + 1 <= p_max_requests,
    'remaining', GREATEST(p_max_requests - (v_count + 1), 0),
    'reset_at', v_reset_at
  );
END;
$$;
