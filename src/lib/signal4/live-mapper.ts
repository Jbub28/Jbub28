import { v5 as uuidv5 } from "uuid";
import type { CrashEvent, CrashSeverity } from "@/lib/types/crash";
import type { Signal4EventPoint } from "./types";

const LIVE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function inferSeverity(point: Signal4EventPoint): CrashSeverity {
  const fatalities = point.attributes.fatalityCnt ?? 0;
  const injuries = point.attributes.serInjuryCnt ?? 0;

  if (fatalities > 0) return "fatal";
  if (injuries >= 3) return "incapacitating";
  if (injuries > 0) return "non-incapacitating";
  if (point.attributes.crashSev) {
    const s = point.attributes.crashSev.toLowerCase();
    if (s.includes("fatal")) return "fatal";
    if (s.includes("incap")) return "incapacitating";
    if (s.includes("injury")) return "non-incapacitating";
  }
  return "unknown";
}

function stableReportNumber(point: Signal4EventPoint): string {
  const key = [
    point.x.toFixed(6),
    point.y.toFixed(6),
    point.attributes.fatalityCnt ?? 0,
    point.attributes.serInjuryCnt ?? 0,
    point.attributes.crashSevCd ?? 0,
  ].join("|");
  return `s4-live-${uuidv5(key, LIVE_NAMESPACE)}`;
}

/** Map Signal4 public map event points to app CrashEvent records. */
export function mapSignal4EventPoints(
  points: Signal4EventPoint[],
  userId: string,
  syncedAt: string,
  year = new Date().getFullYear()
): CrashEvent[] {
  const seen = new Set<string>();
  const crashes: CrashEvent[] = [];
  // YTD snapshot date — not "right now", so points aren't treated as live incidents.
  const ytdReferenceDate = `${year}-07-01T12:00:00.000Z`;

  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;

    const reportNumber = stableReportNumber(point);
    if (seen.has(reportNumber)) continue;
    seen.add(reportNumber);

    const fatalities = point.attributes.fatalityCnt ?? 0;
    const injuries = point.attributes.serInjuryCnt ?? 0;
    const severity = inferSeverity(point);

    crashes.push({
      id: uuidv5(reportNumber, LIVE_NAMESPACE),
      user_id: userId,
      data_source: "signal4",
      import_source: "signal4_analytics",
      report_number: reportNumber,
      crash_datetime: ytdReferenceDate,
      latitude: point.y,
      longitude: point.x,
      severity,
      severity_detail: point.attributes.crashSev ?? undefined,
      day_or_night: point.attributes.dayNight ?? undefined,
      crash_type: point.attributes.crashType ?? undefined,
      is_speeding_related: false,
      is_distracted: false,
      is_alcohol_related: false,
      is_intersection_related: false,
      is_pedestrian_involved: false,
      is_bicyclist_involved: false,
      fatality_count: fatalities,
      injury_count: injuries,
      vehicle_count: 0,
      risk_factors: {
        source: "signal4_live",
        live_feed: true,
        synced_at: syncedAt,
        hazard_status: "historic",
        public_dashboard: true,
      },
    });
  }

  return crashes;
}

/** Keep crashes within radius of a point (miles). */
export function filterCrashesNear(
  crashes: CrashEvent[],
  lat: number,
  lng: number,
  radiusMiles: number
): CrashEvent[] {
  const radiusM = radiusMiles * 1609.34;
  return crashes.filter((c) => {
    const dLat = ((c.latitude - lat) * Math.PI) / 180;
    const dLng = ((c.longitude - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((c.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distM = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distM <= radiusM;
  });
}
