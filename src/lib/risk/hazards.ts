import { v4 as uuidv4 } from "uuid";
import type { CrashEvent } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import type {
  HazardSeverity,
  HazardSource,
  HazardType,
  RouteHazard,
} from "@/lib/types/hazard";
import { distanceAlongPolylineMeters, distancePointToPolylineMeters } from "@/lib/risk/route-buffer";

const ACTIVE_CRASH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function severityFromCrash(crash: CrashEvent): HazardSeverity {
  const score = severityToScore(crash.severity);
  if (crash.fatality_count > 0 || score >= 100) return "critical";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function isRecentCrash(crash: CrashEvent, now = Date.now()): boolean {
  const t = new Date(crash.crash_datetime).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= ACTIVE_CRASH_WINDOW_MS;
}

function isExplicitlyActive(crash: CrashEvent): boolean {
  const factors = crash.risk_factors ?? {};
  if (factors.is_active === true || factors.active === true) return true;
  if (typeof factors.hazard_status === "string") {
    return factors.hazard_status.toLowerCase() === "active";
  }
  return false;
}

function hazardTypeForCrash(crash: CrashEvent, now = Date.now()): HazardType {
  if (isExplicitlyActive(crash)) return "active_crash";
  if (isRecentCrash(crash, now) && severityFromCrash(crash) !== "low") {
    return "active_crash";
  }
  return "historic_crash";
}

function titleForCrash(crash: CrashEvent, type: HazardType): string {
  const road = crash.road_name ?? "Route segment";
  if (type === "active_crash") return `Active incident — ${road}`;
  return `Historic crash hotspot — ${road}`;
}

function descriptionForCrash(crash: CrashEvent, type: HazardType): string {
  const parts: string[] = [];
  parts.push(`${crash.severity} severity`);
  if (crash.fatality_count > 0) parts.push(`${crash.fatality_count} fatality`);
  if (crash.is_speeding_related) parts.push("speeding-related");
  if (crash.is_intersection_related) parts.push("intersection");
  if (crash.weather_condition) parts.push(crash.weather_condition);

  const base = parts.join(" · ");
  if (type === "active_crash") {
    return `Recent or active incident on your route. ${base}`;
  }
  return `Historic crash cluster from Signal4 data. ${base}`;
}

/** Convert crash records into route hazards (extensible for CSV hardening). */
export function crashesToHazards(
  crashes: CrashEvent[],
  source: HazardSource = "signal4"
): RouteHazard[] {
  const now = Date.now();
  return crashes.map((crash) => {
    const type = hazardTypeForCrash(crash, now);
    const severity = severityFromCrash(crash);
    return {
      id: `hazard-${crash.id}`,
      type,
      status: type === "active_crash" ? "active" : "monitoring",
      severity,
      lat: crash.latitude,
      lng: crash.longitude,
      title: titleForCrash(crash, type),
      description: descriptionForCrash(crash, type),
      source,
      reportedAt: crash.crash_datetime,
      relatedCrashIds: [crash.id],
      metadata: {
        road_name: crash.road_name,
        county: crash.county_name,
        crash_type: crash.crash_type,
      },
    };
  });
}

/** Detect crash clusters as composite hazards. */
export function detectCrashClusters(
  crashes: CrashEvent[],
  cellSize = 0.005,
  minCount = 3
): RouteHazard[] {
  const cells = new Map<string, CrashEvent[]>();
  for (const crash of crashes) {
    const key = `${Math.round(crash.latitude / cellSize)},${Math.round(crash.longitude / cellSize)}`;
    const group = cells.get(key) ?? [];
    group.push(crash);
    cells.set(key, group);
  }

  const hazards: RouteHazard[] = [];
  for (const [, group] of cells) {
    if (group.length < minCount) continue;
    const lat = group.reduce((s, c) => s + c.latitude, 0) / group.length;
    const lng = group.reduce((s, c) => s + c.longitude, 0) / group.length;
    const fatalities = group.reduce((s, c) => s + c.fatality_count, 0);
    hazards.push({
      id: uuidv4(),
      type: "crash_cluster",
      status: "monitoring",
      severity: fatalities > 0 || group.length >= 5 ? "high" : "medium",
      lat,
      lng,
      title: `Crash cluster — ${group[0].road_name ?? "corridor"}`,
      description: `${group.length} historic crashes clustered along this corridor.`,
      source: "signal4",
      reportedAt: new Date().toISOString(),
      relatedCrashIds: group.map((c) => c.id),
    });
  }
  return hazards;
}

/** Merge crash-derived hazards with optional external hazards (future API/CSV). */
export function buildHazardCatalog(
  crashes: CrashEvent[],
  externalHazards: RouteHazard[] = []
): RouteHazard[] {
  const fromCrashes = crashesToHazards(crashes);
  const clusters = detectCrashClusters(crashes);
  const byId = new Map<string, RouteHazard>();

  for (const h of [...fromCrashes, ...clusters, ...externalHazards]) {
    const existing = byId.get(h.id);
    if (!existing || severityRank(h.severity) > severityRank(existing.severity)) {
      byId.set(h.id, h);
    }
  }
  return Array.from(byId.values());
}

function severityRank(s: HazardSeverity): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s];
}

/** Hazards along a route polyline, annotated with distance ahead. */
export function getHazardsAlongRoute(
  hazards: RouteHazard[],
  coordinates: [number, number][],
  bufferMeters = 500,
  fromRouteIndex = 0
): RouteHazard[] {
  if (coordinates.length < 2) return [];

  const segment = coordinates.slice(fromRouteIndex);
  const results: RouteHazard[] = [];

  for (const hazard of hazards) {
    const point = { lat: hazard.lat, lng: hazard.lng };
    const dist = distancePointToPolylineMeters(point, segment);
    if (dist <= bufferMeters) {
      results.push({
        ...hazard,
        distanceAheadMeters: distanceAlongPolylineMeters(coordinates, fromRouteIndex, point),
      });
    }
  }

  return results.sort((a, b) => (a.distanceAheadMeters ?? 0) - (b.distanceAheadMeters ?? 0));
}

/** Return hazards that appeared since the last snapshot. */
export function detectNewHazards(
  previous: RouteHazard[],
  current: RouteHazard[]
): RouteHazard[] {
  const prevIds = new Set(previous.map((h) => h.id));
  return current.filter((h) => !prevIds.has(h.id) && h.status === "active");
}

/** Return hazards whose severity increased. */
export function detectEscalatedHazards(
  previous: RouteHazard[],
  current: RouteHazard[]
): RouteHazard[] {
  const prevById = new Map(previous.map((h) => [h.id, h]));
  return current.filter((h) => {
    const prev = prevById.get(h.id);
    return prev && severityRank(h.severity) > severityRank(prev.severity);
  });
}
