CREATE TABLE IF NOT EXISTS signal4_state_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_title TEXT NOT NULL,
  data_through TEXT,
  last_updated TEXT,
  report_data JSONB NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE signal4_state_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own state reports" ON signal4_state_reports
  FOR ALL USING (auth.uid() = user_id);
