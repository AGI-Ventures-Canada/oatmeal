ALTER TABLE prize_fulfillments
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_detail text;
