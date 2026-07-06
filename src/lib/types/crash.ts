export type DataSource = "personal" | "fleet" | "signal4";
export type ImportSource = "signal4_analytics" | "manual";
export type RiskLevel = "low" | "medium" | "high";

export type CrashSeverity =
  | "fatal"
  | "incapacitating"
  | "non-incapacitating"
  | "possible"
  | "none"
  | "unknown";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CrashEvent {
  id: string;
  user_id: string;
  data_source: DataSource;
  import_source: ImportSource;
  report_number: string;
  crash_datetime: string;
  latitude: number;
  longitude: number;
  county_name?: string;
  city_name?: string;
  road_name?: string;
  severity: CrashSeverity;
  severity_detail?: string;
  light_condition?: string;
  weather_condition?: string;
  road_surface?: string;
  day_or_night?: string;
  crash_type?: string;
  is_speeding_related: boolean;
  is_distracted: boolean;
  is_alcohol_related: boolean;
  is_intersection_related: boolean;
  is_pedestrian_involved: boolean;
  is_bicyclist_involved: boolean;
  fatality_count: number;
  injury_count: number;
  vehicle_count: number;
  risk_factors?: Record<string, unknown>;
  created_at?: string;
}

export interface HighRiskCorridor {
  id: string;
  user_id: string;
  data_source: DataSource;
  corridor_hash: string;
  name: string;
  crash_count: number;
  avg_severity_score: number;
  total_fatalities: number;
  total_injuries: number;
  center: LatLng;
  waypoints: LatLng[];
  risk_patterns?: Record<string, unknown>;
}

export interface AreaRiskScore {
  id: string;
  user_id: string;
  data_source: DataSource;
  score: number;
  safety_index: number;
  factors: AreaRiskFactors;
  crash_count: number;
  calculated_at: string;
}

export interface AreaRiskFactors {
  severity: { label: string; score: number; detail: string };
  timeOfDay: { label: string; score: number; detail: string }[];
  weather: { label: string; score: number; detail: string }[];
  roadType: { label: string; score: number; detail: string }[];
  contributingFactors: { label: string; score: number; detail: string }[];
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
  nearby_crash_count: number;
  contributing_factors?: Record<string, unknown>;
  created_at?: string;
}

export interface PatternInsight {
  category: string;
  label: string;
  value: string;
  riskContribution: number;
  eventsAffected: number;
}

export function severityToScore(severity: CrashSeverity): number {
  const map: Record<CrashSeverity, number> = {
    fatal: 100,
    incapacitating: 75,
    "non-incapacitating": 50,
    possible: 30,
    none: 10,
    unknown: 25,
  };
  return map[severity] ?? 25;
}

export function parseSeverity(raw?: string): CrashSeverity {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s.includes("fatal")) return "fatal";
  if (s.includes("incapacitating") && !s.includes("non")) return "incapacitating";
  if (s.includes("non-incapacitating") || s.includes("nonincapacitating")) return "non-incapacitating";
  if (s.includes("possible")) return "possible";
  if (s.includes("none") || s.includes("no injury")) return "none";
  return "unknown";
}
