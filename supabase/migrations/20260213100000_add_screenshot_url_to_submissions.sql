ALTER TABLE submissions ADD COLUMN screenshot_url text;

COMMENT ON COLUMN submissions.screenshot_url IS 'URL to an app screenshot uploaded by the submitter';
