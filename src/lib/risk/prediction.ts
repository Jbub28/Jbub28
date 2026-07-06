import { v4 as uuidv4 } from "uuid";
import type {
  CommonRoute,
  RiskLevel,
  RoutePrediction,
  Trip,
} from "@/lib/types/driving";
import { findMatchingRoute } from "./routes";

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

function riskLevelLabel(level: RiskLevel): string {
  return { low: "Low", medium: "Medium", high: "High" }[level];
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
  trips: Trip[];
  commonRoutes: CommonRoute[];
}

export function predictRouteRisk(input: PredictionInput): RoutePrediction {
  const {
    userId,
    originAddress,
    destinationAddress,
    plannedDate,
    plannedTime,
    trips,
    commonRoutes,
  } = input;

  const [hours] = plannedTime.split(":").map(Number);
  const plannedDateTime = new Date(`${plannedDate}T${plannedTime}`);
  const timeOfDay = getTimeOfDay(hours);
  const dayOfWeek = plannedDateTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let riskScore = 30;
  const factors: string[] = [];

  const matchingRoute = findMatchingRoute(
    commonRoutes,
    input.originLat,
    input.originLng,
    input.destLat,
    input.destLng
  );

  if (matchingRoute) {
    const routeRisk = matchingRoute.avg_risk_score ?? 20;
    riskScore += routeRisk * 0.6;
    factors.push(
      `You've driven this route ${matchingRoute.trip_count} times before with an average risk profile.`
    );

    const patterns = matchingRoute.risk_patterns as Record<string, number> | undefined;
    if (patterns?.nightDrivingPct && patterns.nightDrivingPct > 40 && timeOfDay === "night") {
      riskScore += 15;
      factors.push(
        `${patterns.nightDrivingPct}% of your past trips on this route were at night, which aligns with your planned time.`
      );
    }
    if (patterns?.phoneUsePct && patterns.phoneUsePct > 20) {
      riskScore += 10;
      factors.push("This route has a history of phone use during your past trips.");
    }
  } else {
    factors.push(
      "This appears to be a less familiar route based on your driving history."
    );
    riskScore += 12;
  }

  const sameTimeTrips = trips.filter((t) => t.time_of_day === timeOfDay);
  if (sameTimeTrips.length > 0) {
    const nightRisk = timeOfDay === "night";
    const eveningRisk = timeOfDay === "evening";
    if (nightRisk) {
      riskScore += 18;
      factors.push("Night driving is historically riskier in your trip data.");
    } else if (eveningRisk) {
      riskScore += 10;
      factors.push("Evening rush-hour trips show elevated risk patterns for you.");
    }

    const avgBraking =
      sameTimeTrips.reduce((s, t) => s + t.harsh_braking_count, 0) /
      sameTimeTrips.length;
    if (avgBraking > 1) {
      riskScore += 8;
      factors.push(
        `You average ${avgBraking.toFixed(1)} harsh braking events during ${timeOfDay} trips.`
      );
    }
  }

  if (isWeekend && timeOfDay === "night") {
    riskScore += 8;
    factors.push("Late weekend nights tend to have higher incident rates.");
  }

  if (hours >= 7 && hours <= 9 && !isWeekend) {
    riskScore += 6;
    factors.push("Morning commute hours may add congestion-related risk.");
  }

  if (hours >= 16 && hours <= 18 && !isWeekend) {
    riskScore += 8;
    factors.push("Afternoon rush hour increases exposure on this type of trip.");
  }

  riskScore = Math.min(100, Math.max(1, Math.round(riskScore)));
  const riskLevel = riskLevelFromScore(riskScore);

  const explanation = buildPlainEnglishExplanation(
    riskLevel,
    riskScore,
    originAddress,
    destinationAddress,
    plannedDate,
    plannedTime,
    factors
  );

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "personal",
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
    contributing_factors: {
      timeOfDay,
      isWeekend,
      matchingRoute: matchingRoute?.name ?? null,
      factorDetails: factors,
    },
    created_at: new Date().toISOString(),
  };
}

function buildPlainEnglishExplanation(
  level: RiskLevel,
  score: number,
  origin: string,
  destination: string,
  date: string,
  time: string,
  factors: string[]
): string {
  const dateStr = new Date(`${date}T${time}`).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  let intro = `For your trip from "${origin}" to "${destination}" on ${dateStr}, `;
  intro += `we predict **${riskLevelLabel(level)} risk** (score: ${score}/100). `;

  if (level === "low") {
    intro +=
      "Based on your personal driving history, this trip looks relatively safe. ";
  } else if (level === "medium") {
    intro +=
      "This trip has some risk factors worth being aware of, but nothing extreme. ";
  } else {
    intro +=
      "Several factors from your driving history suggest elevated caution for this trip. ";
  }

  if (factors.length > 0) {
    intro += factors.join(" ");
  } else {
    intro += "We don't have enough matching history to identify specific patterns.";
  }

  return intro.replace(/\*\*/g, "");
}
