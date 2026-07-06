import { v4 as uuidv4 } from "uuid";
import type {
  AreaRiskFactors,
  AreaRiskScore,
  CrashEvent,
  PatternInsight,
} from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function analyzeSeverity(crashes: CrashEvent[]): AreaRiskFactors["severity"] {
  if (crashes.length === 0) {
    return { label: "Crash severity", score: 0, detail: "No crash data loaded" };
  }
  const avg =
    crashes.reduce((s, c) => s + severityToScore(c.severity), 0) / crashes.length;
  const fatalities = crashes.reduce((s, c) => s + c.fatality_count, 0);
  return {
    label: "Crash severity",
    score: clamp(Math.round(avg), 0, 100),
    detail: `${crashes.length} crashes, ${fatalities} fatalities, avg severity score ${Math.round(avg)}`,
  };
}

function analyzeTimeOfDay(crashes: CrashEvent[]): AreaRiskFactors["timeOfDay"] {
  const buckets: Record<string, { count: number; score: number }> = {};
  for (const crash of crashes) {
    const tod = crash.day_or_night ?? "Unknown";
    const bucket = buckets[tod] ?? { count: 0, score: 0 };
    bucket.count++;
    bucket.score += tod.toLowerCase().includes("night") ? 30 : 12;
    buckets[tod] = bucket;
  }
  return Object.entries(buckets)
    .map(([label, val]) => ({
      label,
      score: val.count > 0 ? Math.round(val.score / val.count) : 0,
      detail: `${val.count} crashes`,
    }))
    .sort((a, b) => b.score - a.score);
}

function analyzeWeather(crashes: CrashEvent[]): AreaRiskFactors["weather"] {
  const buckets: Record<string, number> = {};
  for (const crash of crashes) {
    const w = crash.weather_condition ?? "Unknown";
    buckets[w] = (buckets[w] ?? 0) + 1;
  }
  const riskMap: Record<string, number> = {
    rain: 25,
    fog: 30,
    snow: 35,
    clear: 10,
    unknown: 12,
  };
  return Object.entries(buckets).map(([weather, count]) => ({
    label: weather,
    score: riskMap[weather.toLowerCase()] ?? 15,
    detail: `${count} crashes in ${weather} conditions`,
  }));
}

function analyzeRoadType(crashes: CrashEvent[]): AreaRiskFactors["roadType"] {
  const buckets: Record<string, number> = {};
  for (const crash of crashes) {
    const road = crash.road_name ?? "Unknown";
    let type = "Local";
    if (/I-|interstate|I\s*\d/i.test(road)) type = "Interstate";
    else if (/US-|SR-|HWY|Highway/i.test(road)) type = "Highway";
    else if (/Blvd|Ave|St/i.test(road)) type = "Arterial";
    buckets[type] = (buckets[type] ?? 0) + 1;
  }
  const riskMap: Record<string, number> = {
    Interstate: 28,
    Highway: 22,
    Arterial: 18,
    Local: 14,
  };
  return Object.entries(buckets).map(([type, count]) => ({
    label: type,
    score: riskMap[type] ?? 15,
    detail: `${count} crashes on ${type.toLowerCase()} roads`,
  }));
}

function analyzeContributing(crashes: CrashEvent[]): AreaRiskFactors["contributingFactors"] {
  const factors = [
    { key: "is_speeding_related", label: "Speeding-related" },
    { key: "is_distracted", label: "Distracted driving" },
    { key: "is_alcohol_related", label: "Alcohol-related" },
    { key: "is_intersection_related", label: "Intersection-related" },
    { key: "is_pedestrian_involved", label: "Pedestrian-involved" },
  ] as const;

  return factors.map(({ key, label }) => {
    const count = crashes.filter((c) => c[key]).length;
    const pct = crashes.length > 0 ? (count / crashes.length) * 100 : 0;
    return {
      label,
      score: clamp(Math.round(pct * 1.2), 0, 100),
      detail: `${count} of ${crashes.length} crashes (${Math.round(pct)}%)`,
    };
  }).sort((a, b) => b.score - a.score);
}

function buildExplanation(
  factors: Omit<AreaRiskFactors, "overallExplanation">,
  safetyIndex: number
): string {
  const parts: string[] = [];
  if (safetyIndex >= 70) {
    parts.push("Historic crash patterns in this dataset indicate relatively lower corridor risk.");
  } else if (safetyIndex >= 45) {
    parts.push("Historic Signal4 data shows moderate crash risk across analyzed corridors.");
  } else {
    parts.push("Historic crash data indicates elevated risk in several corridors.");
  }
  if (factors.severity.score >= 50) {
    parts.push("Severity levels are a significant factor in the overall risk index.");
  }
  const topFactor = factors.contributingFactors[0];
  if (topFactor && topFactor.score >= 20) {
    parts.push(`${topFactor.label} crashes are notably frequent in this dataset.`);
  }
  return parts.join(" ");
}

export function calculateAreaRiskScore(
  crashes: CrashEvent[],
  userId: string
): AreaRiskScore {
  if (crashes.length === 0) {
    return {
      id: uuidv4(),
      user_id: userId,
      data_source: "signal4",
      score: 50,
      safety_index: 50,
      factors: {
        severity: { label: "Crash severity", score: 0, detail: "No data" },
        timeOfDay: [],
        weather: [],
        roadType: [],
        contributingFactors: [],
        overallExplanation:
          "Import Signal4 Analytics crash data to generate a historic risk index.",
      },
      crash_count: 0,
      calculated_at: new Date().toISOString(),
    };
  }

  const severity = analyzeSeverity(crashes);
  const timeOfDay = analyzeTimeOfDay(crashes);
  const weather = analyzeWeather(crashes);
  const roadType = analyzeRoadType(crashes);
  const contributingFactors = analyzeContributing(crashes);

  const avgTime =
    timeOfDay.length > 0
      ? timeOfDay.reduce((s, t) => s + t.score, 0) / timeOfDay.length
      : 0;
  const avgWeather =
    weather.length > 0 ? weather.reduce((s, w) => s + w.score, 0) / weather.length : 0;
  const avgRoad =
    roadType.length > 0 ? roadType.reduce((s, r) => s + r.score, 0) / roadType.length : 0;
  const avgContrib =
    contributingFactors.length > 0
      ? contributingFactors.slice(0, 3).reduce((s, c) => s + c.score, 0) / 3
      : 0;

  const compositeRisk = clamp(
    Math.round(
      severity.score * 0.35 +
        avgTime * 0.2 +
        avgWeather * 0.1 +
        avgRoad * 0.15 +
        avgContrib * 0.2
    ),
    1,
    100
  );

  const safetyIndex = clamp(100 - compositeRisk + 35, 1, 100);
  const partial = { severity, timeOfDay, weather, roadType, contributingFactors };
  const factors: AreaRiskFactors = {
    ...partial,
    overallExplanation: buildExplanation(partial, safetyIndex),
  };

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "signal4",
    score: compositeRisk,
    safety_index: safetyIndex,
    factors,
    crash_count: crashes.length,
    calculated_at: new Date().toISOString(),
  };
}

export function extractPatternInsights(crashes: CrashEvent[]): PatternInsight[] {
  const score = calculateAreaRiskScore(crashes, "temp");
  const insights: PatternInsight[] = [];

  insights.push({
    category: "Severity",
    label: score.factors.severity.label,
    value: score.factors.severity.detail,
    riskContribution: score.factors.severity.score,
    eventsAffected: crashes.length,
  });

  for (const t of score.factors.timeOfDay.slice(0, 2)) {
    insights.push({
      category: "Time of day",
      label: t.label,
      value: t.detail,
      riskContribution: t.score,
      eventsAffected: parseInt(t.detail) || 0,
    });
  }

  for (const c of score.factors.contributingFactors.slice(0, 3)) {
    insights.push({
      category: "Contributing factor",
      label: c.label,
      value: c.detail,
      riskContribution: c.score,
      eventsAffected: parseInt(c.detail) || 0,
    });
  }

  return insights.sort((a, b) => b.riskContribution - a.riskContribution);
}
