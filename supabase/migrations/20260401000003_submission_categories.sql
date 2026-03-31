CREATE TABLE submission_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  prize_id uuid REFERENCES prizes(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE submission_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to submission_categories" ON submission_categories FOR ALL USING (false);

CREATE TABLE submission_category_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES submission_categories(id) ON DELETE CASCADE,
  UNIQUE(submission_id, category_id)
);

ALTER TABLE submission_category_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to submission_category_entries" ON submission_category_entries FOR ALL USING (false);
