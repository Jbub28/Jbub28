-- Personal Route Risk Predictor - Initial Schema
-- Designed for personal driving data with future fleet expansion (TECO)

-- Data source enum for personal vs fleet records
CREATE TYPE data_source AS ENUM ('personal', 'fleet');
CREATE TYPE import_source AS ENUM ('google_takeout', 'geico_driveeasy', 'manual');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_data_source data_source NOT NULL DEFAULT 'personal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Driving trips from personal or fleet sources
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'personal',
  import_source import_source NOT NULL,
  external_id TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  distance_miles DECIMAL(10, 2),
  duration_minutes INTEGER,
  start_lat DECIMAL(10, 7),
  start_lng DECIMAL(10, 7),
  end_lat DECIMAL(10, 7),
  end_lng DECIMAL(10, 7),
  start_address TEXT,
  end_address TEXT,
  route_polyline JSONB DEFAULT '[]',
  max_speed_mph DECIMAL(6, 2),
  avg_speed_mph DECIMAL(6, 2),
  harsh_braking_count INTEGER DEFAULT 0,
  harsh_acceleration_count INTEGER DEFAULT 0,
  phone_use_count INTEGER DEFAULT 0,
  speeding_events INTEGER DEFAULT 0,
  weather TEXT,
  road_type TEXT,
  time_of_day TEXT,
  risk_factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_start_time ON trips(start_time);
CREATE INDEX idx_trips_data_source ON trips(data_source);

-- Identified common routes from trip history
CREATE TABLE common_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'personal',
  route_hash TEXT NOT NULL,
  name TEXT,
  trip_count INTEGER NOT NULL DEFAULT 1,
  avg_risk_score DECIMAL(5, 2),
  total_distance_miles DECIMAL(10, 2),
  waypoints JSONB DEFAULT '[]',
  typical_duration_minutes INTEGER,
  risk_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, route_hash, data_source)
);

-- Historical risk score snapshots
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'personal',
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
  safety_score INTEGER NOT NULL CHECK (safety_score >= 1 AND safety_score <= 100),
  factors JSONB NOT NULL DEFAULT '{}',
  trip_count INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_user ON risk_scores(user_id, calculated_at DESC);

-- Future route predictions
CREATE TABLE route_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_source data_source NOT NULL DEFAULT 'personal',
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  origin_lat DECIMAL(10, 7),
  origin_lng DECIMAL(10, 7),
  dest_lat DECIMAL(10, 7),
  dest_lng DECIMAL(10, 7),
  planned_date DATE NOT NULL,
  planned_time TIME NOT NULL,
  risk_level risk_level NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 1 AND risk_score <= 100),
  explanation TEXT NOT NULL,
  contributing_factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import audit log
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  import_source import_source NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_imported INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Future: TECO fleet expansion tables (placeholder structure)
CREATE TABLE fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_org TEXT NOT NULL DEFAULT 'TECO',
  vehicle_id TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fleet_org, vehicle_id)
);

CREATE TABLE fleet_accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_org TEXT NOT NULL DEFAULT 'TECO',
  vehicle_id TEXT,
  accident_date TIMESTAMPTZ NOT NULL,
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  severity TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own trips" ON trips
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own routes" ON common_routes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own risk scores" ON risk_scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own predictions" ON route_predictions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own import logs" ON import_logs
  FOR ALL USING (auth.uid() = user_id);
