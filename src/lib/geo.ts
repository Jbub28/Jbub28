export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MI = 3958.8;
const EARTH_RADIUS_M = 6371000;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export interface NearestPointResult {
  index: number;
  distanceMeters: number;
  point: LatLng;
  distanceAlongMeters: number;
}

/** Find the closest point on a polyline to a given position. */
export function nearestPointOnPolyline(
  position: LatLng,
  coordinates: [number, number][]
): NearestPointResult | null {
  if (coordinates.length === 0) return null;

  let bestIndex = 0;
  let bestDistance = Infinity;
  let bestPoint: LatLng = { lat: coordinates[0][1], lng: coordinates[0][0] };
  let distanceAlong = 0;
  let accumulated = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const point = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const dist = haversineMeters(position, point);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestIndex = i;
      bestPoint = point;
      distanceAlong = accumulated;
    }
    if (i < coordinates.length - 1) {
      const next = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
      accumulated += haversineMeters(point, next);
    }
  }

  return {
    index: bestIndex,
    distanceMeters: bestDistance,
    point: bestPoint,
    distanceAlongMeters: distanceAlong,
  };
}

export function remainingDistanceMeters(
  coordinates: [number, number][],
  fromIndex: number
): number {
  let total = 0;
  for (let i = fromIndex; i < coordinates.length - 1; i++) {
    total += haversineMeters(
      { lat: coordinates[i][1], lng: coordinates[i][0] },
      { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] }
    );
  }
  return total;
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles >= 0.1) return `${miles.toFixed(1)} mi`;
  const feet = meters * 3.28084;
  if (feet >= 500) return `${Math.round(feet / 100) * 100} ft`;
  return `${Math.round(feet)} ft`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}
