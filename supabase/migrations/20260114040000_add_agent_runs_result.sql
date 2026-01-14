-- Add result column to agent_runs for storing the final output/result
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS result jsonb;

-- Comment for documentation
COMMENT ON COLUMN agent_runs.result IS 'The final result/output from the agent run';
