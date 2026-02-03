-- Update sponsor tier enum to add 'none'
-- Keep old values for backward compatibility

-- Add 'none' to the enum
ALTER TYPE sponsor_tier ADD VALUE IF NOT EXISTS 'none';

-- Note: Cannot change default to 'none' in same transaction as ADD VALUE
-- The application will handle the default
