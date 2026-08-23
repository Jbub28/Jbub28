-- Signal4 Analytics pivot schema

CREATE TYPE crash_severity AS ENUM (
  'fatal',
  'incapacitating',
  'non-incapacitating',
  'possible',
  'none',
  'unknown'
);

ALTER TYPE data_source ADD VALUE IF NOT EXISTS 'signal4';
ALTER TYPE import_source ADD VALUE IF NOT EXISTS 'signal4_analytics';

CREATE TABLE IF NOT EXISTS crash_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'signal4',
  import_source import_source NOT NULL DEFAULT 'signal4_analytics',
  report_number TEXT NOT NULL,
  crash_datetime TIMESTAMPTZ NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  county_name TEXT,
  city_name TEXT,
  road_name TEXT,
  severity crash_severity NOT NULL DEFAULT 'unknown',
  severity_detail TEXT,
  light_condition TEXT,
  weather_condition TEXT,
  road_surface TEXT,
  day_or_night TEXT,
  crash_type TEXT,
  is_speeding_related BOOLEAN DEFAULT FALSE,
  is_distracted BOOLEAN DEFAULT FALSE,
  is_alcohol_related BOOLEAN DEFAULT FALSE,
  is_intersection_related BOOLEAN DEFAULT FALSE,
  is_pedestrian_involved BOOLEAN DEFAULT FALSE,
  is_bicyclist_involved BOOLEAN DEFAULT FALSE,
  fatality_count INTEGER DEFAULT 0,
  injury_count INTEGER DEFAULT 0,
  vehicle_count INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, report_number)
);

CREATE TABLE IF NOT EXISTS high_risk_corridors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'signal4',
  corridor_hash TEXT NOT NULL,
  name TEXT,
  crash_count INTEGER NOT NULL DEFAULT 1,
  avg_severity_score DECIMAL(5, 2),
  total_fatalities INTEGER DEFAULT 0,
  total_injuries INTEGER DEFAULT 0,
  center JSONB NOT NULL,
  waypoints JSONB DEFAULT '[]',
  risk_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, corridor_hash, data_source)
);

CREATE TABLE IF NOT EXISTS area_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'signal4',
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
  safety_index INTEGER NOT NULL CHECK (safety_index >= 1 AND safety_index <= 100),
  factors JSONB NOT NULL DEFAULT '{}',
  crash_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE route_predictions
  ADD COLUMN IF NOT EXISTS nearby_crash_count INTEGER DEFAULT 0;

ALTER TABLE crash_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_risk_corridors ENABLE ROW LEVEL SECURITY;
ALTER TABLE area_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own crashes" ON crash_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own corridors" ON high_risk_corridors
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own area scores" ON area_risk_scores
  FOR ALL USING (auth.uid() = user_id);
