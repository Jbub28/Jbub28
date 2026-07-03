import { v4 as uuidv4 } from "uuid";
import type {
  PatternInsight,
  RiskFactors,
  RiskScore,
  Trip,
} from "@/lib/types/driving";

const TIME_LABELS: Record<string, string> = {
  morning: "Morning (5am–12pm)",
  afternoon: "Afternoon (12pm–5pm)",
  evening: "Evening (5pm–9pm)",
  night: "Night (9pm–5am)",
};

const ROAD_LABELS: Record<string, string> = {
  highway: "Highway",
  arterial: "Arterial roads",
  local: "Local streets",
  unknown: "Unknown roads",
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function analyzeTimeOfDay(trips: Trip[]): RiskFactors["timeOfDay"] {
  const buckets: Record<string, { count: number; risk: number }> = {};

  for (const trip of trips) {
    const tod = trip.time_of_day ?? "unknown";
    const bucket = buckets[tod] ?? { count: 0, risk: 0 };
    bucket.count++;
    if (tod === "night") bucket.risk += 25;
    else if (tod === "evening") bucket.risk += 10;
    else bucket.risk += 5;
    buckets[tod] = bucket;
  }

  return Object.entries(buckets)
    .map(([key, val]) => ({
      label: TIME_LABELS[key] ?? key,
      score: val.count > 0 ? Math.round(val.risk / val.count) : 0,
      detail: `${val.count} trips during this period`,
    }))
    .sort((a, b) => b.score - a.score);
}

function analyzeSpeed(trips: Trip[]): RiskFactors["speed"] {
  const speeds = trips
    .map((t) => t.max_speed_mph ?? t.avg_speed_mph)
    .filter((s): s is number => s != null);

  if (speeds.length === 0) {
    return { label: "Speed", score: 0, detail: "No speed data available" };
  }

  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const over75 = speeds.filter((s) => s > 75).length;
  let score = 0;
  if (avg > 70) score += 30;
  else if (avg > 55) score += 15;
  score += over75 * 5;

  return {
    label: "Speed",
    score: clamp(score, 0, 100),
    detail: `Average max speed ${Math.round(avg)} mph across ${speeds.length} trips`,
  };
}

function analyzeBraking(trips: Trip[]): RiskFactors["braking"] {
  const total = trips.reduce((s, t) => s + t.harsh_braking_count, 0);
  const perTrip = trips.length > 0 ? total / trips.length : 0;
  const score = clamp(Math.round(perTrip * 20), 0, 100);

  return {
    label: "Harsh braking",
    score,
    detail:
      total === 0
        ? "No harsh braking events recorded"
        : `${total} harsh braking events (${perTrip.toFixed(1)} per trip on average)`,
  };
}

function analyzePhoneUse(trips: Trip[]): RiskFactors["phoneUse"] {
  const phoneTrips = trips.filter((t) => t.phone_use_count > 0).length;
  const pct = trips.length > 0 ? (phoneTrips / trips.length) * 100 : 0;
  const score = clamp(Math.round(pct * 1.5), 0, 100);

  return {
    label: "Phone use",
    score,
    detail:
      phoneTrips === 0
        ? "No phone use detected in your trip data"
        : `Phone use detected on ${phoneTrips} of ${trips.length} trips (${Math.round(pct)}%)`,
  };
}

function analyzeWeather(trips: Trip[]): RiskFactors["weather"] {
  const buckets: Record<string, number> = {};
  for (const trip of trips) {
    const w = trip.weather ?? "unknown";
    buckets[w] = (buckets[w] ?? 0) + 1;
  }

  const riskMap: Record<string, number> = {
    rain: 20,
    snow: 35,
    fog: 25,
    clear: 5,
    unknown: 8,
  };

  return Object.entries(buckets).map(([weather, count]) => ({
    label: weather.charAt(0).toUpperCase() + weather.slice(1),
    score: riskMap[weather] ?? 10,
    detail: `${count} trips in ${weather} conditions`,
  }));
}

function analyzeRoadType(trips: Trip[]): RiskFactors["roadType"] {
  const buckets: Record<string, { count: number; risk: number }> = {};

  for (const trip of trips) {
    const road = trip.road_type ?? "unknown";
    const bucket = buckets[road] ?? { count: 0, risk: 0 };
    bucket.count++;
    if (road === "highway") bucket.risk += 12;
    else if (road === "arterial") bucket.risk += 8;
    else bucket.risk += 5;
    buckets[road] = bucket;
  }

  return Object.entries(buckets).map(([road, val]) => ({
    label: ROAD_LABELS[road] ?? road,
    score: val.count > 0 ? Math.round(val.risk / val.count) : 0,
    detail: `${val.count} trips on this road type`,
  }));
}

function buildExplanation(factors: Omit<RiskFactors, "overallExplanation">, safetyScore: number): string {
  const parts: string[] = [];

  if (safetyScore >= 80) {
    parts.push("Your overall driving profile looks relatively safe.");
  } else if (safetyScore >= 60) {
    parts.push("Your driving shows moderate risk in a few areas worth attention.");
  } else {
    parts.push("Your driving history shows several elevated risk patterns.");
  }

  const topTime = factors.timeOfDay[0];
  if (topTime && topTime.score >= 15) {
    parts.push(`Trips during ${topTime.label.toLowerCase()} tend to be riskier for you.`);
  }

  if (factors.speed.score >= 20) {
    parts.push(factors.speed.detail + ".");
  }

  if (factors.braking.score >= 20) {
    parts.push("Harsh braking is a notable factor in your risk profile.");
  }

  if (factors.phoneUse.score >= 15) {
    parts.push("Phone use while driving is increasing your risk.");
  }

  return parts.join(" ");
}

export function calculateRiskScore(
  trips: Trip[],
  userId: string
): RiskScore {
  if (trips.length === 0) {
    return {
      id: uuidv4(),
      user_id: userId,
      data_source: "personal",
      score: 50,
      safety_score: 50,
      factors: {
        timeOfDay: [],
        speed: { label: "Speed", score: 0, detail: "No data" },
        braking: { label: "Harsh braking", score: 0, detail: "No data" },
        phoneUse: { label: "Phone use", score: 0, detail: "No data" },
        weather: [],
        roadType: [],
        overallExplanation:
          "Import your driving history to generate a personalized risk score.",
      },
      trip_count: 0,
      calculated_at: new Date().toISOString(),
    };
  }

  const timeOfDay = analyzeTimeOfDay(trips);
  const speed = analyzeSpeed(trips);
  const braking = analyzeBraking(trips);
  const phoneUse = analyzePhoneUse(trips);
  const weather = analyzeWeather(trips);
  const roadType = analyzeRoadType(trips);

  const avgTimeRisk =
    timeOfDay.length > 0
      ? timeOfDay.reduce((s, t) => s + t.score, 0) / timeOfDay.length
      : 0;
  const avgWeatherRisk =
    weather.length > 0
      ? weather.reduce((s, w) => s + w.score, 0) / weather.length
      : 0;
  const avgRoadRisk =
    roadType.length > 0
      ? roadType.reduce((s, r) => s + r.score, 0) / roadType.length
      : 0;

  const compositeRisk =
    avgTimeRisk * 0.2 +
    speed.score * 0.25 +
    braking.score * 0.2 +
    phoneUse.score * 0.2 +
    avgWeatherRisk * 0.05 +
    avgRoadRisk * 0.1;

  const riskScore = clamp(Math.round(compositeRisk), 1, 100);
  const safetyScore = clamp(100 - riskScore + 50, 1, 100);

  const partialFactors = { timeOfDay, speed, braking, phoneUse, weather, roadType };
  const factors: RiskFactors = {
    ...partialFactors,
    overallExplanation: buildExplanation(partialFactors, safetyScore),
  };

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "personal",
    score: riskScore,
    safety_score: safetyScore,
    factors,
    trip_count: trips.length,
    calculated_at: new Date().toISOString(),
  };
}

export function extractPatternInsights(trips: Trip[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  const timeOfDay = analyzeTimeOfDay(trips);
  for (const t of timeOfDay.slice(0, 3)) {
    insights.push({
      category: "Time of day",
      label: t.label,
      value: t.detail,
      riskContribution: t.score,
      tripsAffected: parseInt(t.detail) || 0,
    });
  }

  const speed = analyzeSpeed(trips);
  insights.push({
    category: "Speed",
    label: speed.label,
    value: speed.detail,
    riskContribution: speed.score,
    tripsAffected: trips.filter((t) => (t.max_speed_mph ?? 0) > 0).length,
  });

  const braking = analyzeBraking(trips);
  insights.push({
    category: "Braking",
    label: braking.label,
    value: braking.detail,
    riskContribution: braking.score,
    tripsAffected: trips.filter((t) => t.harsh_braking_count > 0).length,
  });

  const phone = analyzePhoneUse(trips);
  insights.push({
    category: "Phone use",
    label: phone.label,
    value: phone.detail,
    riskContribution: phone.score,
    tripsAffected: trips.filter((t) => t.phone_use_count > 0).length,
  });

  return insights.sort((a, b) => b.riskContribution - a.riskContribution);
}
