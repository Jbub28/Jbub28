import type { LatLng } from "@/lib/geo";
import { haversineMeters } from "@/lib/geo";

export type DrivingRiskLevel = "normal" | "caution" | "hazardous" | "critical";

export interface GpsSample {
  position: LatLng;
  timestamp: number;
  speedMph: number | null;
  heading: number | null;
  accuracyMeters: number | null;
}

export interface DrivingBehaviorAssessment {
  riskLevel: DrivingRiskLevel;
  score: number;
  currentSpeedMph: number;
  issues: DrivingIssue[];
  affectsOthers: boolean;
  recommendation: string;
  shouldConsiderReroute: boolean;
}

export interface DrivingIssue {
  type:
    | "excessive_speed"
    | "hard_braking"
    | "hard_acceleration"
    | "erratic_speed"
    | "sustained_aggressive";
  severity: "low" | "medium" | "high";
  message: string;
}

const MS_TO_MPH = 2.23694;
const HARD_BRAKE_MPS2 = 7.5;
const HARD_ACCEL_MPS2 = 4.5;
const URBAN_SPEED_MPH = 45;
const HIGHWAY_SPEED_MPH = 80;
const CRITICAL_SPEED_MPH = 90;

export function mphFromSampleSpeed(speedMs: number | null | undefined): number | null {
  if (speedMs == null || speedMs < 0 || !Number.isFinite(speedMs)) return null;
  return speedMs * MS_TO_MPH;
}

export function computeSpeedFromSamples(
  prev: GpsSample | null,
  current: GpsSample
): number | null {
  if (current.speedMph != null && current.speedMph >= 0) return current.speedMph;
  if (!prev) return null;

  const dtSec = (current.timestamp - prev.timestamp) / 1000;
  if (dtSec < 0.5 || dtSec > 30) return null;

  const distM = haversineMeters(prev.position, current.position);
  return (distM / dtSec) * MS_TO_MPH;
}

function accelerationMps2(
  prevSpeedMph: number,
  currentSpeedMph: number,
  dtSec: number
): number {
  const prevMps = prevSpeedMph / MS_TO_MPH;
  const curMps = currentSpeedMph / MS_TO_MPH;
  return (curMps - prevMps) / dtSec;
}

/** Analyze recent GPS samples for behaviors that endanger other road users. */
export function assessDrivingBehavior(
  samples: GpsSample[],
  isUrbanContext = false
): DrivingBehaviorAssessment | null {
  if (samples.length < 2) return null;

  const recent = samples.slice(-8);
  const latest = recent[recent.length - 1];
  const speeds: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    const spd = computeSpeedFromSamples(recent[i - 1], recent[i]);
    if (spd != null) speeds.push(spd);
  }
  if (latest.speedMph != null) speeds.push(latest.speedMph);

  const currentSpeedMph = speeds.length > 0 ? speeds[speeds.length - 1] : 0;
  const issues: DrivingIssue[] = [];
  let score = 0;

  const speedLimit = isUrbanContext ? URBAN_SPEED_MPH : HIGHWAY_SPEED_MPH;

  if (currentSpeedMph >= CRITICAL_SPEED_MPH) {
    issues.push({
      type: "excessive_speed",
      severity: "high",
      message: `Critical speed (${Math.round(currentSpeedMph)} mph) — immediate risk to other drivers`,
    });
    score += 40;
  } else if (currentSpeedMph > speedLimit + 15) {
    issues.push({
      type: "excessive_speed",
      severity: "high",
      message: `Excessive speed (${Math.round(currentSpeedMph)} mph) endangers nearby traffic`,
    });
    score += 28;
  } else if (currentSpeedMph > speedLimit + 8) {
    issues.push({
      type: "excessive_speed",
      severity: "medium",
      message: `Speeding (${Math.round(currentSpeedMph)} mph) — reduce speed for others on the road`,
    });
    score += 15;
  }

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const prevSpd = computeSpeedFromSamples(
      i >= 2 ? recent[i - 2] : null,
      prev
    );
    const curSpd = computeSpeedFromSamples(prev, cur);
    if (prevSpd == null || curSpd == null) continue;

    const dtSec = (cur.timestamp - prev.timestamp) / 1000;
    if (dtSec < 0.5) continue;

    const accel = accelerationMps2(prevSpd, curSpd, dtSec);
    if (accel <= -HARD_BRAKE_MPS2) {
      issues.push({
        type: "hard_braking",
        severity: curSpd > 25 ? "high" : "medium",
        message: "Hard braking detected — following traffic may not react in time",
      });
      score += 18;
    }
    if (accel >= HARD_ACCEL_MPS2 && curSpd > 30) {
      issues.push({
        type: "hard_acceleration",
        severity: "medium",
        message: "Aggressive acceleration — increases collision risk for others",
      });
      score += 12;
    }
  }

  if (speeds.length >= 4) {
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance =
      speeds.reduce((s, v) => s + (v - avg) ** 2, 0) / speeds.length;
    if (variance > 200 && avg > 25) {
      issues.push({
        type: "erratic_speed",
        severity: "medium",
        message: "Erratic speed changes — unpredictable driving affects surrounding vehicles",
      });
      score += 14;
    }
    if (avg > speedLimit + 10 && speeds.filter((s) => s > speedLimit + 5).length >= 3) {
      issues.push({
        type: "sustained_aggressive",
        severity: "high",
        message: "Sustained aggressive driving pattern detected",
      });
      score += 20;
    }
  }

  const uniqueIssues = dedupeIssues(issues);
  score = Math.min(100, score);

  const affectsOthers = uniqueIssues.some(
    (i) => i.severity === "high" || i.type === "excessive_speed" || i.type === "sustained_aggressive"
  );

  let riskLevel: DrivingRiskLevel = "normal";
  if (score >= 50) riskLevel = "critical";
  else if (score >= 30) riskLevel = "hazardous";
  else if (score >= 15) riskLevel = "caution";

  let recommendation = "Driving within safe parameters.";
  if (riskLevel === "caution") {
    recommendation = "Ease off speed and maintain steady following distance.";
  } else if (riskLevel === "hazardous") {
    recommendation =
      "Your driving pattern may endanger others. Slow down and avoid sudden maneuvers.";
  } else if (riskLevel === "critical") {
    recommendation =
      "Critical driving behavior detected. Reduce speed immediately to protect other road users.";
  }

  const shouldConsiderReroute =
    riskLevel === "hazardous" || riskLevel === "critical";

  return {
    riskLevel,
    score,
    currentSpeedMph: Math.round(currentSpeedMph),
    issues: uniqueIssues,
    affectsOthers,
    recommendation,
    shouldConsiderReroute,
  };
}

function dedupeIssues(issues: DrivingIssue[]): DrivingIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    if (seen.has(i.type)) return false;
    seen.add(i.type);
    return true;
  });
}

/** Max extra minutes we'll accept on a safety reroute (not for convenience). */
export const SAFETY_REROUTE_MAX_EXTRA_MINUTES = 2;
export const SAFETY_REROUTE_MAX_EXTRA_PERCENT = 0.08;

export function isRerouteEtaAcceptable(
  originalRemainingMinutes: number,
  newRouteMinutes: number
): boolean {
  const extra = newRouteMinutes - originalRemainingMinutes;
  if (extra <= 0) return true;
  if (extra <= SAFETY_REROUTE_MAX_EXTRA_MINUTES) return true;
  if (originalRemainingMinutes > 0 && extra / originalRemainingMinutes <= SAFETY_REROUTE_MAX_EXTRA_PERCENT) {
    return true;
  }
  return false;
}
