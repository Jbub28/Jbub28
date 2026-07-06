export type DataSource = "personal" | "fleet";
export type ImportSource = "google_takeout" | "geico_driveeasy" | "manual";
export type RiskLevel = "low" | "medium" | "high";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  user_id: string;
  data_source: DataSource;
  import_source: ImportSource;
  external_id?: string;
  start_time: string;
  end_time?: string;
  distance_miles?: number;
  duration_minutes?: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_address?: string;
  end_address?: string;
  route_polyline: LatLng[];
  max_speed_mph?: number;
  avg_speed_mph?: number;
  harsh_braking_count: number;
  harsh_acceleration_count: number;
  phone_use_count: number;
  speeding_events: number;
  weather?: string;
  road_type?: string;
  time_of_day?: string;
  risk_factors?: Record<string, unknown>;
  created_at?: string;
}

export interface CommonRoute {
  id: string;
  user_id: string;
  data_source: DataSource;
  route_hash: string;
  name?: string;
  trip_count: number;
  avg_risk_score?: number;
  total_distance_miles?: number;
  waypoints: LatLng[];
  typical_duration_minutes?: number;
  risk_patterns?: Record<string, unknown>;
}

export interface RiskScore {
  id: string;
  user_id: string;
  data_source: DataSource;
  score: number;
  safety_score: number;
  factors: RiskFactors;
  trip_count: number;
  calculated_at: string;
}

export interface RiskFactors {
  timeOfDay: { label: string; score: number; detail: string }[];
  speed: { label: string; score: number; detail: string };
  braking: { label: string; score: number; detail: string };
  phoneUse: { label: string; score: number; detail: string };
  weather: { label: string; score: number; detail: string }[];
  roadType: { label: string; score: number; detail: string }[];
  overallExplanation: string;
}

export interface RoutePrediction {
  id: string;
  user_id: string;
  data_source: DataSource;
  origin_address: string;
  destination_address: string;
  origin_lat?: number;
  origin_lng?: number;
  dest_lat?: number;
  dest_lng?: number;
  planned_date: string;
  planned_time: string;
  risk_level: RiskLevel;
  risk_score: number;
  explanation: string;
  contributing_factors?: Record<string, unknown>;
  created_at?: string;
}

export interface PatternInsight {
  category: string;
  label: string;
  value: string;
  riskContribution: number;
  tripsAffected: number;
}

export interface GeicoManualEntry {
  date: string;
  startTime: string;
  endTime?: string;
  distanceMiles?: number;
  maxSpeedMph?: number;
  harshBraking?: number;
  harshAcceleration?: number;
  phoneUseMinutes?: number;
  startAddress?: string;
  endAddress?: string;
}
