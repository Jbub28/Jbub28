import { v4 as uuidv4 } from "uuid";
import type { CommonRoute, LatLng, Trip } from "@/lib/types/driving";

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function routeKey(trip: Trip): string {
  const startLat = trip.start_lat ?? trip.route_polyline[0]?.lat ?? 0;
  const startLng = trip.start_lng ?? trip.route_polyline[0]?.lng ?? 0;
  const endLat =
    trip.end_lat ?? trip.route_polyline[trip.route_polyline.length - 1]?.lat ?? 0;
  const endLng =
    trip.end_lng ?? trip.route_polyline[trip.route_polyline.length - 1]?.lng ?? 0;
  return `${roundCoord(startLat)},${roundCoord(startLng)}->${roundCoord(endLat)},${roundCoord(endLng)}`;
}

function routeName(trip: Trip): string {
  if (trip.start_address && trip.end_address) {
    const start = trip.start_address.split(",")[0];
    const end = trip.end_address.split(",")[0];
    return `${start} → ${end}`;
  }
  const key = routeKey(trip);
  const [from, to] = key.split("->");
  return `${from} → ${to}`;
}

function tripRiskPoints(trip: Trip): number {
  let risk = 0;
  risk += (trip.harsh_braking_count ?? 0) * 8;
  risk += (trip.harsh_acceleration_count ?? 0) * 6;
  risk += (trip.phone_use_count ?? 0) * 15;
  risk += (trip.speeding_events ?? 0) * 10;
  if (trip.time_of_day === "night") risk += 12;
  if (trip.max_speed_mph && trip.max_speed_mph > 80) risk += 15;
  return risk;
}

export function identifyCommonRoutes(
  trips: Trip[],
  userId: string
): CommonRoute[] {
  const groups = new Map<string, Trip[]>();

  for (const trip of trips) {
    const key = routeKey(trip);
    const existing = groups.get(key) ?? [];
    existing.push(trip);
    groups.set(key, existing);
  }

  const routes: CommonRoute[] = [];

  for (const [hash, group] of groups) {
    if (group.length < 1) continue;

    const totalDistance = group.reduce(
      (sum, t) => sum + (t.distance_miles ?? 0),
      0
    );
    const avgDuration =
      group.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0) /
      group.length;

    const avgRisk =
      group.reduce((sum, t) => sum + tripRiskPoints(t), 0) / group.length;

    const waypoints: LatLng[] = [];
    const bestTrip = group.find((t) => t.route_polyline.length > 0) ?? group[0];
    if (bestTrip.route_polyline.length > 0) {
      waypoints.push(...bestTrip.route_polyline);
    } else if (bestTrip.start_lat && bestTrip.start_lng) {
      waypoints.push({ lat: bestTrip.start_lat, lng: bestTrip.start_lng });
      if (bestTrip.end_lat && bestTrip.end_lng) {
        waypoints.push({ lat: bestTrip.end_lat, lng: bestTrip.end_lng });
      }
    }

    const nightTrips = group.filter((t) => t.time_of_day === "night").length;
    const phoneTrips = group.filter((t) => t.phone_use_count > 0).length;

    routes.push({
      id: uuidv4(),
      user_id: userId,
      data_source: "personal",
      route_hash: hash,
      name: routeName(group[0]),
      trip_count: group.length,
      avg_risk_score: Math.round(avgRisk * 10) / 10,
      total_distance_miles: Math.round(totalDistance * 10) / 10,
      waypoints,
      typical_duration_minutes: Math.round(avgDuration),
      risk_patterns: {
        nightDrivingPct: Math.round((nightTrips / group.length) * 100),
        phoneUsePct: Math.round((phoneTrips / group.length) * 100),
        avgHarshBraking:
          Math.round(
            (group.reduce((s, t) => s + t.harsh_braking_count, 0) / group.length) * 10
          ) / 10,
      },
    });
  }

  return routes.sort((a, b) => b.trip_count - a.trip_count);
}

export function findMatchingRoute(
  routes: CommonRoute[],
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number
): CommonRoute | null {
  if (!originLat || !originLng || !destLat || !destLng) return null;

  const key = `${roundCoord(originLat)},${roundCoord(originLng)}->${roundCoord(destLat)},${roundCoord(destLng)}`;
  return routes.find((r) => r.route_hash === key) ?? null;
}
