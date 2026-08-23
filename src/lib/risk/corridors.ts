import { v4 as uuidv4 } from "uuid";
import type { CrashEvent, HighRiskCorridor, LatLng } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function corridorKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function identifyHighRiskCorridors(
  crashes: CrashEvent[],
  userId: string
): HighRiskCorridor[] {
  const groups = new Map<string, CrashEvent[]>();

  for (const crash of crashes) {
    const key = corridorKey(crash.latitude, crash.longitude);
    const group = groups.get(key) ?? [];
    group.push(crash);
    groups.set(key, group);
  }

  const corridors: HighRiskCorridor[] = [];

  for (const [hash, group] of groups) {
    const [latStr, lngStr] = hash.split(",");
    const center = { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
    const road = group[0].road_name ?? hash;
    const city = group[0].city_name ?? "";
    const name = city ? `${road} (${city})` : road;

    const avgSeverity =
      group.reduce((s, c) => s + severityToScore(c.severity), 0) / group.length;
    const fatalities = group.reduce((s, c) => s + c.fatality_count, 0);
    const injuries = group.reduce((s, c) => s + c.injury_count, 0);
    const nightPct = Math.round(
      (group.filter((c) => c.day_or_night?.toLowerCase().includes("night")).length /
        group.length) *
        100
    );
    const speedingPct = Math.round(
      (group.filter((c) => c.is_speeding_related).length / group.length) * 100
    );

    corridors.push({
      id: uuidv4(),
      user_id: userId,
      data_source: "signal4",
      corridor_hash: hash,
      name,
      crash_count: group.length,
      avg_severity_score: Math.round(avgSeverity * 10) / 10,
      total_fatalities: fatalities,
      total_injuries: injuries,
      center,
      waypoints: group.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      risk_patterns: { nightPct, speedingPct },
    });
  }

  return corridors.sort((a, b) => b.crash_count - a.crash_count || b.avg_severity_score - a.avg_severity_score);
}

export function findCrashesNearPoint(
  crashes: CrashEvent[],
  lat: number,
  lng: number,
  radiusMiles = 2
): CrashEvent[] {
  const point: LatLng = { lat, lng };
  return crashes.filter(
    (c) => haversine(point, { lat: c.latitude, lng: c.longitude }) <= radiusMiles
  );
}

export function findCrashesNearRoute(
  crashes: CrashEvent[],
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number,
  corridorMiles = 1.5
): CrashEvent[] {
  if (!originLat || !originLng || !destLat || !destLng) return [];

  const origin: LatLng = { lat: originLat, lng: originLng };
  const dest: LatLng = { lat: destLat, lng: destLng };

  return crashes.filter((crash) => {
    const p = { lat: crash.latitude, lng: crash.longitude };
    const dOrigin = haversine(origin, p);
    const dDest = haversine(dest, p);
    const routeLength = haversine(origin, dest);
    const dMid = haversine(
      { lat: (origin.lat + dest.lat) / 2, lng: (origin.lng + dest.lng) / 2 },
      p
    );
    return (
      dOrigin <= corridorMiles ||
      dDest <= corridorMiles ||
      dMid <= corridorMiles + routeLength * 0.15
    );
  });
}

export function matchRoadInText(roadName: string, text: string): boolean {
  const normalized = text.toLowerCase();
  const road = roadName.toLowerCase();
  const tokens = road.split(/\s+/).filter((t) => t.length > 2);
  return tokens.some((t) => normalized.includes(t));
}
