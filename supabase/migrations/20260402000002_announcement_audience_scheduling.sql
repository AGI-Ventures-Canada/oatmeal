-- Add audience targeting for announcements
ALTER TABLE hackathon_announcements
  ADD COLUMN audience text NOT NULL DEFAULT 'everyone'
  CHECK (audience IN ('everyone', 'organizers', 'judges', 'mentors', 'attendees', 'submitted', 'not_submitted'));
