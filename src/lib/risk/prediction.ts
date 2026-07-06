import { v4 as uuidv4 } from "uuid";
import type {
  CrashEvent,
  HighRiskCorridor,
  RiskLevel,
  RoutePrediction,
} from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import {
  findCrashesNearRoute,
  matchRoadInText,
} from "@/lib/risk/corridors";

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 35) return "low";
  if (score <= 65) return "medium";
  return "high";
}

interface PredictionInput {
  userId: string;
  originAddress: string;
  destinationAddress: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  plannedDate: string;
  plannedTime: string;
  crashes: CrashEvent[];
  corridors: HighRiskCorridor[];
}

export function predictRouteRisk(input: PredictionInput): RoutePrediction {
  const {
    userId,
    originAddress,
    destinationAddress,
    plannedDate,
    plannedTime,
    crashes,
    corridors,
  } = input;

  const [hours] = plannedTime.split(":").map(Number);
  const plannedDateTime = new Date(`${plannedDate}T${plannedTime}`);
  const timeOfDay = getTimeOfDay(hours);
  const isWeekend = plannedDateTime.getDay() === 0 || plannedDateTime.getDay() === 6;

  let riskScore = 25;
  const factors: string[] = [];

  const nearbyCrashes = findCrashesNearRoute(
    crashes,
    input.originLat,
    input.originLng,
    input.destLat,
    input.destLng
  );

  const roadMentioned = `${originAddress} ${destinationAddress}`;
  const roadMatchedCrashes = crashes.filter(
    (c) => c.road_name && (matchRoadInText(c.road_name, roadMentioned) || nearbyCrashes.includes(c))
  );

  const relevantCrashes = nearbyCrashes.length > 0 ? nearbyCrashes : roadMatchedCrashes;

  if (relevantCrashes.length === 0) {
    factors.push(
      "No historic crashes from Signal4 were found directly along this corridor in the loaded dataset."
    );
    riskScore += 10;
  } else {
    const avgSeverity =
      relevantCrashes.reduce((s, c) => s + severityToScore(c.severity), 0) /
      relevantCrashes.length;
    riskScore += Math.min(40, relevantCrashes.length * 4);
    riskScore += avgSeverity * 0.25;

    const fatalities = relevantCrashes.reduce((s, c) => s + c.fatality_count, 0);
    factors.push(
      `Signal4 historic data shows ${relevantCrashes.length} crash${relevantCrashes.length > 1 ? "es" : ""} near this route${fatalities > 0 ? `, including ${fatalities} fatality/fatalities` : ""}.`
    );

    const nightCrashes = relevantCrashes.filter((c) =>
      c.day_or_night?.toLowerCase().includes("night")
    );
    if (timeOfDay === "night" && nightCrashes.length > 0) {
      riskScore += 15;
      factors.push(
        `${nightCrashes.length} historic night crashes occurred on this corridor — your planned departure is at night.`
      );
    }

    const speeding = relevantCrashes.filter((c) => c.is_speeding_related).length;
    if (speeding > relevantCrashes.length * 0.3) {
      riskScore += 10;
      factors.push("Speeding was a contributing factor in many historic crashes along this corridor.");
    }

    const distracted = relevantCrashes.filter((c) => c.is_distracted).length;
    if (distracted > 0) {
      riskScore += 6;
      factors.push(`${distracted} distracted-driving crashes recorded near this route.`);
    }

    const rainy = relevantCrashes.filter((c) =>
      c.weather_condition?.toLowerCase().includes("rain")
    );
    if (rainy.length > relevantCrashes.length * 0.25) {
      riskScore += 8;
      factors.push("Rain-related crashes are common on this corridor in the Signal4 dataset.");
    }
  }

  const matchingCorridor = corridors.find((c) =>
    relevantCrashes.some(
      (crash) =>
        Math.abs(crash.latitude - c.center.lat) < 0.02 &&
        Math.abs(crash.longitude - c.center.lng) < 0.02
    )
  );

  if (matchingCorridor) {
    factors.push(
      `This route passes near "${matchingCorridor.name}", a high-risk corridor with ${matchingCorridor.crash_count} historic crashes.`
    );
    riskScore += matchingCorridor.avg_severity_score * 0.15;
  }

  if (hours >= 7 && hours <= 9 && !isWeekend) {
    riskScore += 5;
    factors.push("Morning commute hours add congestion-related exposure.");
  }
  if (hours >= 16 && hours <= 18 && !isWeekend) {
    riskScore += 7;
    factors.push("Afternoon rush hour increases crash exposure on busy corridors.");
  }

  riskScore = Math.min(100, Math.max(1, Math.round(riskScore)));
  const riskLevel = riskLevelFromScore(riskScore);

  const explanation = buildExplanation(
    riskLevel,
    riskScore,
    originAddress,
    destinationAddress,
    plannedDate,
    plannedTime,
    relevantCrashes.length,
    factors
  );

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "signal4",
    origin_address: originAddress,
    destination_address: destinationAddress,
    origin_lat: input.originLat,
    origin_lng: input.originLng,
    dest_lat: input.destLat,
    dest_lng: input.destLng,
    planned_date: plannedDate,
    planned_time: plannedTime,
    risk_level: riskLevel,
    risk_score: riskScore,
    explanation,
    nearby_crash_count: relevantCrashes.length,
    contributing_factors: {
      timeOfDay,
      isWeekend,
      matchingCorridor: matchingCorridor?.name ?? null,
      factorDetails: factors,
      dataSource: "Signal4 Analytics",
    },
    created_at: new Date().toISOString(),
  };
}

function buildExplanation(
  level: RiskLevel,
  score: number,
  origin: string,
  destination: string,
  date: string,
  time: string,
  crashCount: number,
  factors: string[]
): string {
  const dateStr = new Date(`${date}T${time}`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const levelLabel = { low: "Low", medium: "Medium", high: "High" }[level];
  let intro = `For your planned route from "${origin}" to "${destination}" on ${dateStr}, `;
  intro += `historic Signal4 Analytics crash data suggests ${levelLabel} risk (score: ${score}/100). `;

  if (crashCount === 0) {
    intro +=
      "No matching crashes were found in the loaded dataset, so this estimate relies on general time-of-day patterns. ";
  }

  intro += factors.join(" ");
  return intro;
}
