/** Hazard and incident types — extensible when hardened Signal4 CSV is uploaded */

export type HazardType =
  | "historic_crash"
  | "active_crash"
  | "crash_cluster"
  | "construction"
  | "weather"
  | "road_closure"
  | "manual";

export type HazardStatus = "active" | "monitoring" | "cleared";

export type HazardSeverity = "low" | "medium" | "high" | "critical";

export type HazardSource = "signal4" | "user" | "api" | "simulated";

export interface RouteHazard {
  id: string;
  type: HazardType;
  status: HazardStatus;
  severity: HazardSeverity;
  lat: number;
  lng: number;
  title: string;
  description: string;
  source: HazardSource;
  reportedAt: string;
  expiresAt?: string;
  relatedCrashIds?: string[];
  /** Distance along remaining route in meters (set when evaluated on route) */
  distanceAheadMeters?: number;
  metadata?: Record<string, unknown>;
}

export interface RerouteRecommendation {
  id: string;
  urgency: "low" | "medium" | "high";
  reason: string;
  summary: string;
  suggestedAction: string;
  hazards: RouteHazard[];
  distanceAheadMeters: number;
  createdAt: string;
}
