ALTER TABLE webhooks ALTER COLUMN events DROP DEFAULT;
ALTER TABLE webhooks ALTER COLUMN events TYPE text[] USING events::text[];
ALTER TABLE webhook_deliveries ALTER COLUMN event TYPE text USING event::text;

DROP TYPE IF EXISTS webhook_event;

CREATE TYPE webhook_event AS ENUM (
  'hackathon.created',
  'hackathon.updated',
  'submission.created',
  'submission.submitted'
);

ALTER TABLE webhooks ALTER COLUMN events TYPE webhook_event[] USING events::webhook_event[];
ALTER TABLE webhooks ALTER COLUMN events SET DEFAULT '{}';
ALTER TABLE webhook_deliveries ALTER COLUMN event TYPE webhook_event USING event::webhook_event;
