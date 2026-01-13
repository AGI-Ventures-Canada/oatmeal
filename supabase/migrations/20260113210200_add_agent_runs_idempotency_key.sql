-- Add idempotency_key to agent_runs table
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_agent_runs_idempotency 
ON agent_runs(tenant_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
