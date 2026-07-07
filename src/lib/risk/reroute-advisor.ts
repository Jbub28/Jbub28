import { v4 as uuidv4 } from "uuid";
import type { LatLng } from "@/lib/geo";
import { formatDistance } from "@/lib/geo";
import type { NavigationRoute } from "@/lib/mapbox/client";
import type { CrashEvent } from "@/lib/types/crash";
import type { RerouteRecommendation, RouteHazard } from "@/lib/types/hazard";
import {
  buildHazardCatalog,
  detectEscalatedHazards,
  detectNewHazards,
  getHazardsAlongRoute,
} from "@/lib/risk/hazards";

const REROUTE_LOOKAHEAD_M = 3000;
const ACTIVE_REROUTE_SEVERITIES = new Set(["high", "critical"]);

interface EvaluateInput {
  position: LatLng;
  route: NavigationRoute;
  routeProgressIndex: number;
  crashes: CrashEvent[];
  externalHazards?: RouteHazard[];
  previousHazards?: RouteHazard[];
}

function buildSummary(hazards: RouteHazard[]): string {
  const active = hazards.filter((h) => h.type === "active_crash");
  const clusters = hazards.filter((h) => h.type === "crash_cluster");
  const parts: string[] = [];

  if (active.length > 0) {
    parts.push(
      `${active.length} active incident${active.length > 1 ? "s" : ""} ahead on your route`
    );
  }
  if (clusters.length > 0) {
    parts.push(
      `${clusters.length} high-density crash zone${clusters.length > 1 ? "s" : ""} ahead`
    );
  }
  if (parts.length === 0) {
    parts.push(`${hazards.length} hazard${hazards.length > 1 ? "s" : ""} detected ahead`);
  }
  return parts.join(". ") + ".";
}

function buildReason(hazards: RouteHazard[]): string {
  const top = hazards[0];
  if (!top) return "Conditions changed along your route.";
  const dist = top.distanceAheadMeters ?? 0;
  if (top.type === "active_crash") {
    return `Active incident reported ${formatDistance(dist)} ahead near ${top.metadata?.road_name ?? "your route"}.`;
  }
  if (top.type === "crash_cluster") {
    return `High-risk crash cluster ${formatDistance(dist)} ahead — ${top.description}`;
  }
  return `${top.title} ${formatDistance(dist)} ahead.`;
}

function urgencyFromHazards(hazards: RouteHazard[]): RerouteRecommendation["urgency"] {
  if (hazards.some((h) => h.severity === "critical")) return "high";
  if (hazards.some((h) => h.type === "active_crash" && h.severity === "high")) return "high";
  if (hazards.some((h) => ACTIVE_REROUTE_SEVERITIES.has(h.severity))) return "medium";
  return "low";
}

/** Evaluate whether AI should suggest a safer alternate route. */
export function evaluateRerouteNeed(input: EvaluateInput): RerouteRecommendation | null {
  const catalog = buildHazardCatalog(input.crashes, input.externalHazards ?? []);
  const ahead = getHazardsAlongRoute(
    catalog,
    input.route.coordinates,
    500,
    input.routeProgressIndex
  ).filter((h) => (h.distanceAheadMeters ?? Infinity) <= REROUTE_LOOKAHEAD_M);

  const blocking = ahead.filter(
    (h) =>
      h.status === "active" ||
      h.type === "active_crash" ||
      (h.type === "crash_cluster" && h.severity !== "low")
  );

  let triggerHazards = blocking.filter((h) => ACTIVE_REROUTE_SEVERITIES.has(h.severity));

  if (input.previousHazards) {
    const newActive = detectNewHazards(input.previousHazards, ahead);
    const escalated = detectEscalatedHazards(input.previousHazards, ahead);
    const dynamic = [...newActive, ...escalated].filter((h) =>
      ACTIVE_REROUTE_SEVERITIES.has(h.severity)
    );
    if (dynamic.length > 0) {
      triggerHazards = [...triggerHazards, ...dynamic];
    }
  }

  const unique = Array.from(new Map(triggerHazards.map((h) => [h.id, h])).values());
  if (unique.length === 0) return null;

  unique.sort((a, b) => (a.distanceAheadMeters ?? 0) - (b.distanceAheadMeters ?? 0));
  const nearest = unique[0];

  return {
    id: uuidv4(),
    urgency: urgencyFromHazards(unique),
    reason: buildReason(unique),
    summary: buildSummary(unique),
    suggestedAction:
      "A safer alternate route may avoid recent incidents and high-risk corridors. Tap Reroute to recalculate.",
    hazards: unique.slice(0, 5),
    distanceAheadMeters: nearest.distanceAheadMeters ?? 0,
    createdAt: new Date().toISOString(),
  };
}

/** Preview-time advisory (no position required). */
export function evaluateRouteOverviewRisks(
  route: NavigationRoute,
  crashes: CrashEvent[],
  externalHazards: RouteHazard[] = []
): {
  hazards: RouteHazard[];
  highRiskZoneCount: number;
  activeIncidentCount: number;
} {
  const catalog = buildHazardCatalog(crashes, externalHazards);
  const along = getHazardsAlongRoute(catalog, route.coordinates, 600);
  const clusters = along.filter((h) => h.type === "crash_cluster");
  const active = along.filter((h) => h.type === "active_crash" || h.status === "active");

  return {
    hazards: along,
    highRiskZoneCount: clusters.length + along.filter((h) => h.severity === "high" || h.severity === "critical").length,
    activeIncidentCount: active.length,
  };
}
