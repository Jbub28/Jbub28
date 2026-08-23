import { haversineMeters, type LatLng } from "@/lib/geo";
import type { CrashEvent } from "@/lib/types/crash";

/** Minimum distance from a point to a line segment (meters). */
export function distancePointToSegmentMeters(
  point: LatLng,
  segStart: LatLng,
  segEnd: LatLng
): number {
  const dx = segEnd.lng - segStart.lng;
  const dy = segEnd.lat - segStart.lat;
  if (dx === 0 && dy === 0) {
    return haversineMeters(point, segStart);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - segStart.lng) * dx + (point.lat - segStart.lat) * dy) /
        (dx * dx + dy * dy)
    )
  );

  const projected = {
    lat: segStart.lat + t * dy,
    lng: segStart.lng + t * dx,
  };
  return haversineMeters(point, projected);
}

/** Minimum distance from a point to a polyline (meters). */
export function distancePointToPolylineMeters(
  point: LatLng,
  coordinates: [number, number][]
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineMeters(point, { lat: coordinates[0][1], lng: coordinates[0][0] });
  }

  let min = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const dist = distancePointToSegmentMeters(
      point,
      { lat: coordinates[i][1], lng: coordinates[i][0] },
      { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] }
    );
    if (dist < min) min = dist;
  }
  return min;
}

/** Index on polyline closest to a point. */
export function closestIndexOnPolyline(
  point: LatLng,
  coordinates: [number, number][]
): number {
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < coordinates.length; i++) {
    const dist = haversineMeters(point, {
      lat: coordinates[i][1],
      lng: coordinates[i][0],
    });
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/** Distance along polyline from start index to a point's projection (meters). */
export function distanceAlongPolylineMeters(
  coordinates: [number, number][],
  fromIndex: number,
  point: LatLng
): number {
  const start = Math.max(0, Math.min(fromIndex, coordinates.length - 1));
  let total = 0;

  for (let i = start; i < coordinates.length - 1; i++) {
    const a = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const b = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    const segDist = distancePointToSegmentMeters(point, a, b);
    if (segDist < 30) {
      return total + haversineMeters(a, point);
    }
    total += haversineMeters(a, b);
  }
  return total;
}

export interface RouteProximityResult<T> {
  item: T;
  distanceToRouteMeters: number;
  routeIndex: number;
  distanceAheadMeters: number;
}

/** Find crashes within buffer distance of a route polyline. */
export function findCrashesAlongPolyline(
  crashes: CrashEvent[],
  coordinates: [number, number][],
  bufferMeters = 500,
  fromRouteIndex = 0
): RouteProximityResult<CrashEvent>[] {
  if (coordinates.length < 2) return [];

  const segment = coordinates.slice(fromRouteIndex);
  const results: RouteProximityResult<CrashEvent>[] = [];

  for (const crash of crashes) {
    const point = { lat: crash.latitude, lng: crash.longitude };
    const dist = distancePointToPolylineMeters(point, segment);
    if (dist <= bufferMeters) {
      const routeIndex = closestIndexOnPolyline(point, segment) + fromRouteIndex;
      const distanceAheadMeters = distanceAlongPolylineMeters(
        coordinates,
        fromRouteIndex,
        point
      );
      results.push({
        item: crash,
        distanceToRouteMeters: dist,
        routeIndex,
        distanceAheadMeters,
      });
    }
  }

  return results.sort((a, b) => a.distanceAheadMeters - b.distanceAheadMeters);
}
