ALTER TABLE prize_fulfillments
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_detail text;

COMMENT ON COLUMN prize_fulfillments.payment_detail IS
  'Contains user-provided payment handles (Venmo, PayPal, bank info). Encrypted at rest via AES-256-GCM (ENCRYPTION_KEY). Falls back to plaintext if key unavailable. Treat as PII — access restricted to organizers and sponsors via application-layer auth.';
