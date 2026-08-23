import type { CrashEvent } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import { findCrashesAlongPolyline } from "@/lib/risk/route-buffer";
import { haversineMeters } from "@/lib/geo";

export interface TemporalRiskResult {
  score: number;
  matchCount: number;
  factors: string[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Circular minute distance (0–1439 minutes in day). */
function minuteDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

function crashMinuteOfDay(crash: CrashEvent): number | null {
  const d = new Date(crash.crash_datetime);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function crashSecondOfMinute(crash: CrashEvent): number | null {
  const d = new Date(crash.crash_datetime);
  if (Number.isNaN(d.getTime())) return null;
  return d.getSeconds();
}

/**
 * Score how closely historic crash times at this location match the planned departure.
 * Uses day-of-week, hour, minute, and second proximity.
 */
export function computeTemporalCrashRisk(
  crashes: CrashEvent[],
  coordinates: [number, number][],
  plannedAt: Date,
  bufferMeters = 600
): TemporalRiskResult {
  const along = findCrashesAlongPolyline(crashes, coordinates, bufferMeters);
  if (along.length === 0) {
    return { score: 0, matchCount: 0, factors: [] };
  }

  const plannedDay = plannedAt.getDay();
  const plannedMinute = plannedAt.getHours() * 60 + plannedAt.getMinutes();
  const plannedSecond = plannedAt.getSeconds();
  const plannedDayName = DAY_NAMES[plannedDay];

  let score = 0;
  let matchCount = 0;
  const factors: string[] = [];

  const sameDayCrashes = along.filter(({ item }) => {
    const d = new Date(item.crash_datetime);
    return !Number.isNaN(d.getTime()) && d.getDay() === plannedDay;
  });

  if (sameDayCrashes.length > 0) {
    const pct = Math.round((sameDayCrashes.length / along.length) * 100);
    score += Math.min(12, sameDayCrashes.length * 2);
    factors.push(
      `${sameDayCrashes.length} historic crash${sameDayCrashes.length > 1 ? "es" : ""} on this route occurred on ${plannedDayName}s (${pct}% of corridor).`
    );
  }

  const tightTimeMatches: CrashEvent[] = [];
  const hourMatches: CrashEvent[] = [];

  for (const { item: crash } of along) {
    const crashMinute = crashMinuteOfDay(crash);
    if (crashMinute == null) continue;

    const minDist = minuteDistance(plannedMinute, crashMinute);
    const crashSec = crashSecondOfMinute(crash) ?? 0;
    const secDist = Math.abs(plannedSecond - crashSec);

    if (minDist <= 15 && secDist <= 30) {
      tightTimeMatches.push(crash);
    } else if (minDist <= 60) {
      hourMatches.push(crash);
    }
  }

  if (tightTimeMatches.length > 0) {
    matchCount += tightTimeMatches.length;
    const avgSeverity =
      tightTimeMatches.reduce((s, c) => s + severityToScore(c.severity), 0) /
      tightTimeMatches.length;
    score += Math.min(25, tightTimeMatches.length * 5 + avgSeverity * 0.1);
    factors.push(
      `${tightTimeMatches.length} crash${tightTimeMatches.length > 1 ? "es" : ""} occurred within ±15 min and ±30 sec of your planned departure time along this route.`
    );
  }

  if (hourMatches.length > 0) {
    matchCount += hourMatches.length;
    score += Math.min(15, hourMatches.length * 3);
    if (tightTimeMatches.length === 0) {
      factors.push(
        `${hourMatches.length} historic crash${hourMatches.length > 1 ? "es" : ""} within the same hour window on this corridor.`
      );
    }
  }

  const locationTimeClusters = clusterByLocationAndTime(along.map((a) => a.item), plannedAt);
  if (locationTimeClusters.length > 0) {
    score += Math.min(10, locationTimeClusters.length * 4);
    factors.push(
      `${locationTimeClusters.length} location-specific time pattern${locationTimeClusters.length > 1 ? "s" : ""} — crashes repeat at similar times near the same coordinates.`
    );
  }

  return {
    score: Math.min(40, Math.round(score)),
    matchCount,
    factors,
  };
}

function clusterByLocationAndTime(crashes: CrashEvent[], plannedAt: Date): string[] {
  const cellSize = 0.003;
  const plannedMinute = plannedAt.getHours() * 60 + plannedAt.getMinutes();
  const clusters = new Map<string, CrashEvent[]>();

  for (const crash of crashes) {
    const key = `${Math.round(crash.latitude / cellSize)},${Math.round(crash.longitude / cellSize)}`;
    const group = clusters.get(key) ?? [];
    group.push(crash);
    clusters.set(key, group);
  }

  const matches: string[] = [];
  for (const [key, group] of clusters) {
    if (group.length < 2) continue;
    const timeMatches = group.filter((c) => {
      const m = crashMinuteOfDay(c);
      return m != null && minuteDistance(plannedMinute, m) <= 30;
    });
    if (timeMatches.length >= 2) matches.push(key);
  }
  return matches;
}

/** Location-weighted temporal score for a specific point. */
export function temporalRiskAtPoint(
  crashes: CrashEvent[],
  lat: number,
  lng: number,
  plannedAt: Date,
  radiusMeters = 800
): number {
  const nearby = crashes.filter(
    (c) => haversineMeters({ lat, lng }, { lat: c.latitude, lng: c.longitude }) <= radiusMeters
  );
  if (nearby.length === 0) return 0;

  const plannedMinute = plannedAt.getHours() * 60 + plannedAt.getMinutes();
  let score = 0;
  for (const crash of nearby) {
    const m = crashMinuteOfDay(crash);
    if (m == null) continue;
    const dist = minuteDistance(plannedMinute, m);
    if (dist <= 15) score += 8;
    else if (dist <= 60) score += 4;
    else if (new Date(crash.crash_datetime).getDay() === plannedAt.getDay()) score += 2;
  }
  return Math.min(30, score);
}
