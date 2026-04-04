-- Add claim tokens to prize fulfillments so winners can claim prizes via email link

ALTER TABLE prize_fulfillments ADD COLUMN IF NOT EXISTS claim_token text UNIQUE;
ALTER TABLE prize_fulfillments ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz;

CREATE INDEX idx_prize_fulfillments_claim_token
  ON prize_fulfillments(claim_token)
  WHERE claim_token IS NOT NULL;
