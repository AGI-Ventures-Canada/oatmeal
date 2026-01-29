CREATE TYPE hackathon_status AS ENUM (
  'draft',
  'published',
  'registration_open',
  'active',
  'judging',
  'completed',
  'archived'
);

CREATE TYPE participant_role AS ENUM (
  'participant',
  'judge',
  'mentor',
  'organizer'
);

CREATE TYPE submission_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'winner'
);

CREATE TYPE team_status AS ENUM (
  'forming',
  'locked',
  'disbanded'
);

CREATE TABLE IF NOT EXISTS hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  rules text,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  max_participants integer,
  min_team_size integer DEFAULT 1,
  max_team_size integer DEFAULT 5,
  allow_solo boolean DEFAULT true,
  status hackathon_status NOT NULL DEFAULT 'draft',
  banner_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_hackathons_tenant_id ON hackathons(tenant_id);
CREATE INDEX idx_hackathons_status ON hackathons(status);
CREATE INDEX idx_hackathons_slug ON hackathons(tenant_id, slug);

ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to hackathons" ON hackathons FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  captain_clerk_user_id text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  status team_status NOT NULL DEFAULT 'forming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_hackathon_id ON teams(hackathon_id);
CREATE INDEX idx_teams_invite_code ON teams(invite_code);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to teams" ON teams FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS hackathon_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  role participant_role NOT NULL DEFAULT 'participant',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, clerk_user_id)
);

CREATE INDEX idx_hackathon_participants_hackathon ON hackathon_participants(hackathon_id);
CREATE INDEX idx_hackathon_participants_user ON hackathon_participants(clerk_user_id);
CREATE INDEX idx_hackathon_participants_team ON hackathon_participants(team_id);

ALTER TABLE hackathon_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to hackathon_participants" ON hackathon_participants FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES hackathon_participants(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  github_url text,
  live_app_url text,
  demo_video_url text,
  status submission_status NOT NULL DEFAULT 'draft',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_hackathon ON submissions(hackathon_id);
CREATE INDEX idx_submissions_team ON submissions(team_id);
CREATE INDEX idx_submissions_status ON submissions(status);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to submissions" ON submissions FOR ALL USING (false);
