import { v4 as uuidv4 } from "uuid";
import type { ImportSource, LatLng, Trip } from "@/lib/types/driving";

interface GoogleTimelineActivity {
  start?: string;
  end?: string;
  distanceMeters?: number;
  startLatitudeE7?: number;
  startLongitudeE7?: number;
  endLatitudeE7?: number;
  endLongitudeE7?: number;
  activityType?: string;
  confidence?: string;
}

interface GoogleTimelineSegment {
  activity?: GoogleTimelineActivity;
  timelinePath?: { point?: string; time?: string }[];
}

interface GoogleTimelineObject {
  timelineObjects?: GoogleTimelineSegment[];
}

interface GoogleSemanticSegment {
  startTime?: string;
  endTime?: string;
  activity?: {
    start?: string;
    end?: string;
    distanceMeters?: number;
    topCandidate?: { type?: string };
  };
  timelinePath?: { point?: string; time?: string }[];
}

interface GoogleSemanticHistory {
  semanticSegments?: GoogleSemanticSegment[];
}

interface GoogleLocationRecord {
  timestampMs?: string;
  latitudeE7?: number;
  longitudeE7?: number;
}

interface GoogleRecordsFile {
  locations?: GoogleLocationRecord[];
}

function e7ToDegrees(e7?: number): number | undefined {
  if (e7 == null) return undefined;
  return e7 / 1e7;
}

function parsePoint(point?: string): LatLng | null {
  if (!point) return null;
  const match = point.match(/geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function inferRoadType(speedMph?: number): string {
  if (!speedMph) return "unknown";
  if (speedMph > 55) return "highway";
  if (speedMph > 35) return "arterial";
  return "local";
}

function buildTripFromSegment(
  userId: string,
  start: Date,
  end: Date | undefined,
  distanceMeters: number | undefined,
  startLat?: number,
  startLng?: number,
  endLat?: number,
  endLng?: number,
  polyline: LatLng[] = [],
  externalId?: string
): Trip | null {
  const durationMinutes = end
    ? Math.round((end.getTime() - start.getTime()) / 60000)
    : undefined;

  if (durationMinutes !== undefined && durationMinutes < 2) return null;
  if (!startLat && !startLng && polyline.length === 0) return null;

  const distanceMiles = distanceMeters
    ? distanceMeters / 1609.34
    : polyline.length > 1
      ? estimateDistance(polyline)
      : undefined;

  const avgSpeedMph =
    distanceMiles && durationMinutes && durationMinutes > 0
      ? (distanceMiles / durationMinutes) * 60
      : undefined;

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "personal",
    import_source: "google_takeout" as ImportSource,
    external_id: externalId,
    start_time: start.toISOString(),
    end_time: end?.toISOString(),
    distance_miles: distanceMiles ? Math.round(distanceMiles * 100) / 100 : undefined,
    duration_minutes: durationMinutes,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    route_polyline: polyline,
    avg_speed_mph: avgSpeedMph ? Math.round(avgSpeedMph) : undefined,
    max_speed_mph: avgSpeedMph ? Math.round(avgSpeedMph * 1.15) : undefined,
    harsh_braking_count: 0,
    harsh_acceleration_count: 0,
    phone_use_count: 0,
    speeding_events: avgSpeedMph && avgSpeedMph > 70 ? 1 : 0,
    time_of_day: getTimeOfDay(start),
    road_type: inferRoadType(avgSpeedMph),
    weather: "unknown",
  };
}

function estimateDistance(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i]);
  }
  return total;
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

function parseTimelineObjects(
  data: GoogleTimelineObject,
  userId: string
): Trip[] {
  const trips: Trip[] = [];

  for (const obj of data.timelineObjects ?? []) {
    const activity = obj.activity;
    if (!activity) continue;

    const type = activity.activityType?.toLowerCase() ?? "";
    if (type && !type.includes("vehicle") && !type.includes("driving") && type !== "in_passenger_vehicle") {
      if (type !== "unknown") continue;
    }

    const start = activity.start ? new Date(activity.start) : null;
    if (!start || isNaN(start.getTime())) continue;

    const end = activity.end ? new Date(activity.end) : undefined;
    const polyline = (obj.timelinePath ?? [])
      .map((p) => parsePoint(p.point))
      .filter((p): p is LatLng => p !== null);

    const trip = buildTripFromSegment(
      userId,
      start,
      end,
      activity.distanceMeters,
      e7ToDegrees(activity.startLatitudeE7),
      e7ToDegrees(activity.startLongitudeE7),
      e7ToDegrees(activity.endLatitudeE7),
      e7ToDegrees(activity.endLongitudeE7),
      polyline,
      activity.start
    );

    if (trip) trips.push(trip);
  }

  return trips;
}

function parseSemanticHistory(
  data: GoogleSemanticHistory,
  userId: string
): Trip[] {
  const trips: Trip[] = [];

  for (const segment of data.semanticSegments ?? []) {
    const activity = segment.activity;
    const type = activity?.topCandidate?.type?.toLowerCase() ?? "";
    if (type && !type.includes("vehicle") && !type.includes("driving")) continue;

    const startStr = segment.startTime ?? activity?.start;
    const endStr = segment.endTime ?? activity?.end;
    if (!startStr) continue;

    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : undefined;
    const polyline = (segment.timelinePath ?? [])
      .map((p) => parsePoint(p.point))
      .filter((p): p is LatLng => p !== null);

    const trip = buildTripFromSegment(
      userId,
      start,
      end,
      activity?.distanceMeters,
      polyline[0]?.lat,
      polyline[0]?.lng,
      polyline[polyline.length - 1]?.lat,
      polyline[polyline.length - 1]?.lng,
      polyline,
      startStr
    );

    if (trip) trips.push(trip);
  }

  return trips;
}

function parseLocationRecords(data: GoogleRecordsFile, userId: string): Trip[] {
  const locations = (data.locations ?? [])
    .map((loc) => ({
      time: loc.timestampMs ? new Date(parseInt(loc.timestampMs, 10)) : null,
      lat: e7ToDegrees(loc.latitudeE7),
      lng: e7ToDegrees(loc.longitudeE7),
    }))
    .filter((l) => l.time && l.lat != null && l.lng != null)
    .sort((a, b) => a.time!.getTime() - b.time!.getTime());

  const trips: Trip[] = [];
  let cluster: typeof locations = [];

  for (const loc of locations) {
    if (cluster.length === 0) {
      cluster.push(loc);
      continue;
    }

    const last = cluster[cluster.length - 1];
    const gap = loc.time!.getTime() - last.time!.getTime();
    const dist = haversine(
      { lat: last.lat!, lng: last.lng! },
      { lat: loc.lat!, lng: loc.lng! }
    );

    if (gap > 15 * 60 * 1000 || dist > 5) {
      if (cluster.length >= 3) {
        const polyline = cluster.map((c) => ({ lat: c.lat!, lng: c.lng! }));
        const trip = buildTripFromSegment(
          userId,
          cluster[0].time!,
          cluster[cluster.length - 1].time!,
          undefined,
          cluster[0].lat,
          cluster[0].lng,
          cluster[cluster.length - 1].lat,
          cluster[cluster.length - 1].lng,
          polyline
        );
        if (trip) trips.push(trip);
      }
      cluster = [loc];
    } else {
      cluster.push(loc);
    }
  }

  return trips;
}

export function parseGoogleTakeout(
  raw: unknown,
  userId: string
): { trips: Trip[]; format: string } {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid Google Takeout file: expected JSON object");
  }

  const data = raw as Record<string, unknown>;

  if ("timelineObjects" in data) {
    return {
      trips: parseTimelineObjects(data as GoogleTimelineObject, userId),
      format: "Timeline.json",
    };
  }

  if ("semanticSegments" in data) {
    return {
      trips: parseSemanticHistory(data as GoogleSemanticHistory, userId),
      format: "Semantic Location History",
    };
  }

  if ("locations" in data) {
    return {
      trips: parseLocationRecords(data as GoogleRecordsFile, userId),
      format: "Records.json",
    };
  }

  throw new Error(
    "Unrecognized Google Takeout format. Expected Timeline.json, Semantic Location History, or Records.json"
  );
}

export function parseGoogleTakeoutFiles(
  files: { name: string; content: unknown }[],
  userId: string
): Trip[] {
  const allTrips: Trip[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    try {
      const { trips } = parseGoogleTakeout(file.content, userId);
      for (const trip of trips) {
        const key = trip.external_id ?? trip.start_time;
        if (!seen.has(key)) {
          seen.add(key);
          allTrips.push(trip);
        }
      }
    } catch {
      continue;
    }
  }

  return allTrips;
}
