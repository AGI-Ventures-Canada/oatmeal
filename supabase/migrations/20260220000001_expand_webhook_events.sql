ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'participant.registered';
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'submission.updated';
ALTER TYPE webhook_event ADD VALUE IF NOT EXISTS 'results.published';
