import type { CrashEvent } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import { findCrashesAlongPolyline } from "@/lib/risk/route-buffer";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  crashCount: number;
  maxSeverity: number;
}

/** Build weighted heatmap points along a route corridor. */
export function buildRouteHeatmapPoints(
  crashes: CrashEvent[],
  coordinates: [number, number][],
  bufferMeters = 600
): HeatmapPoint[] {
  const along = findCrashesAlongPolyline(crashes, coordinates, bufferMeters);
  if (along.length === 0) return [];

  const cellSize = 0.004;
  const cells = new Map<string, { crashes: CrashEvent[]; lat: number; lng: number }>();

  for (const { item: crash } of along) {
    const cellLat = Math.round(crash.latitude / cellSize) * cellSize;
    const cellLng = Math.round(crash.longitude / cellSize) * cellSize;
    const key = `${cellLat},${cellLng}`;
    const cell = cells.get(key) ?? { crashes: [], lat: cellLat, lng: cellLng };
    cell.crashes.push(crash);
    cells.set(key, cell);
  }

  return Array.from(cells.values()).map(({ crashes: group, lat, lng }) => {
    const maxSeverity = Math.max(...group.map((c) => severityToScore(c.severity)));
    const fatalities = group.reduce((s, c) => s + c.fatality_count, 0);
    const weight = Math.min(
      1,
      0.2 + group.length * 0.15 + maxSeverity / 200 + fatalities * 0.2
    );
    return {
      lat,
      lng,
      weight,
      crashCount: group.length,
      maxSeverity,
    };
  });
}

export function heatmapPointsToGeoJSON(points: HeatmapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      properties: {
        weight: p.weight,
        crashCount: p.crashCount,
        maxSeverity: p.maxSeverity,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat],
      },
    })),
  };
}

export interface RouteRiskZone {
  id: string;
  lat: number;
  lng: number;
  crashCount: number;
  severityLabel: string;
  label: string;
}

/** Summarize high-risk zones for the route preview panel. */
export function summarizeRouteRiskZones(
  crashes: CrashEvent[],
  coordinates: [number, number][],
  bufferMeters = 500,
  limit = 5
): RouteRiskZone[] {
  const along = findCrashesAlongPolyline(crashes, coordinates, bufferMeters);
  const cellSize = 0.006;
  const cells = new Map<string, CrashEvent[]>();

  for (const { item: crash } of along) {
    const key = `${Math.round(crash.latitude / cellSize)},${Math.round(crash.longitude / cellSize)}`;
    const group = cells.get(key) ?? [];
    group.push(crash);
    cells.set(key, group);
  }

  return Array.from(cells.entries())
    .map(([key, group]) => {
      const lat = group.reduce((s, c) => s + c.latitude, 0) / group.length;
      const lng = group.reduce((s, c) => s + c.longitude, 0) / group.length;
      const fatalities = group.reduce((s, c) => s + c.fatality_count, 0);
      const road = group[0].road_name ?? "Unknown road";
      const severityLabel =
        fatalities > 0 ? "critical" : group.length >= 3 ? "high" : "elevated";
      return {
        id: key,
        lat,
        lng,
        crashCount: group.length,
        severityLabel,
        label: `${road} — ${group.length} historic crash${group.length > 1 ? "es" : ""}`,
      };
    })
    .sort((a, b) => b.crashCount - a.crashCount)
    .slice(0, limit);
}
