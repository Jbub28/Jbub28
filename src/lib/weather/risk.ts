import type { CrashEvent } from "@/lib/types/crash";
import type { CurrentWeather, WeatherRiskAssessment, WeatherSeverity } from "@/lib/types/weather";
import { findCrashesAlongPolyline } from "@/lib/risk/route-buffer";

function severityFromScore(score: number): WeatherSeverity {
  if (score <= 10) return "none";
  if (score <= 25) return "low";
  if (score <= 45) return "medium";
  if (score <= 70) return "high";
  return "severe";
}

/** Score real-time weather conditions for driving risk. */
export function assessWeatherRisk(weather: CurrentWeather): WeatherRiskAssessment {
  let score = 0;
  const factors: string[] = [];

  if (weather.isThunderstorm) {
    score += 35;
    factors.push(`Thunderstorm conditions (${weather.weatherLabel})`);
  }
  if (weather.isSevere) {
    score += 15;
    factors.push("Severe weather alert level");
  }
  if (weather.isRaining) {
    score += weather.rainMm > 5 ? 25 : weather.rainMm > 1 ? 18 : 12;
    factors.push(
      `Rain — ${weather.rainMm.toFixed(1)} mm/hr increases crash risk on this corridor`
    );
  }
  if (weather.isFog) {
    score += 22;
    factors.push("Fog reduces visibility — historic crash data shows elevated risk");
  }
  if (weather.isSnowing) {
    score += 30;
    factors.push("Snow/ice conditions");
  }
  if (weather.windGustMph >= 45) {
    score += 20;
    factors.push(`High wind gusts — ${weather.windGustMph} mph`);
  } else if (weather.windGustMph >= 30) {
    score += 10;
    factors.push(`Elevated winds — ${weather.windGustMph} mph gusts`);
  }
  if (weather.temperatureF >= 100) {
    score += 8;
    factors.push(`Extreme heat — ${weather.temperatureF}°F`);
  } else if (weather.temperatureF <= 32 && weather.precipitationMm > 0) {
    score += 15;
    factors.push(`Freezing conditions — ${weather.temperatureF}°F with precipitation`);
  }

  score = Math.min(100, score);
  const severity = severityFromScore(score);

  let recommendation: string | undefined;
  if (severity === "severe" || severity === "high") {
    recommendation =
      "Consider delaying travel or selecting an alternate route. Conditions significantly increase crash risk.";
  } else if (severity === "medium") {
    recommendation = "Reduce speed and increase following distance. Monitor conditions along your route.";
  }

  return { score, severity, factors, recommendation };
}

/** Combine multiple weather readings into route-level assessment. */
export function assessRouteWeather(conditions: CurrentWeather[]): WeatherRiskAssessment {
  if (conditions.length === 0) {
    return { score: 0, severity: "none", factors: ["Weather data unavailable"] };
  }

  const assessments = conditions.map(assessWeatherRisk);
  const maxScore = Math.max(...assessments.map((a) => a.score));
  const allFactors = assessments.flatMap((a) => a.factors);
  const uniqueFactors = Array.from(new Set(allFactors));
  const worst = assessments.find((a) => a.score === maxScore);

  return {
    score: maxScore,
    severity: severityFromScore(maxScore),
    factors: uniqueFactors.slice(0, 6),
    recommendation: worst?.recommendation,
  };
}

/** Boost score when historic crashes at location share current weather pattern. */
export function historicWeatherMatchBoost(
  crashes: CrashEvent[],
  coordinates: [number, number][],
  currentWeather: CurrentWeather,
  bufferMeters = 600
): { boost: number; detail: string } {
  const along = findCrashesAlongPolyline(crashes, coordinates, bufferMeters);
  if (along.length === 0) return { boost: 0, detail: "" };

  const currentPatterns: string[] = [];
  if (currentWeather.isRaining) currentPatterns.push("rain");
  if (currentWeather.isFog) currentPatterns.push("fog");
  if (currentWeather.isThunderstorm) currentPatterns.push("thunder");
  if (currentWeather.windGustMph >= 30) currentPatterns.push("wind");

  let matches = 0;
  for (const { item: crash } of along) {
    const w = (crash.weather_condition ?? "").toLowerCase();
    if (currentPatterns.some((p) => w.includes(p))) matches++;
    else if (currentWeather.isRaining && w.includes("rain")) matches++;
    else if (currentWeather.isFog && w.includes("fog")) matches++;
  }

  if (matches === 0) return { boost: 0, detail: "" };

  const pct = Math.round((matches / along.length) * 100);
  const boost = Math.min(20, Math.round((matches / along.length) * 25));
  return {
    boost,
    detail: `${matches} historic crash${matches > 1 ? "es" : ""} on this route occurred in similar weather (${pct}% of corridor crashes).`,
  };
}

/** Detect meaningful weather change between snapshots. */
export function detectWeatherChange(
  previous: CurrentWeather | null,
  current: CurrentWeather
): string | null {
  if (!previous) return null;

  if (!previous.isRaining && current.isRaining) {
    return `Rain started — ${current.weatherLabel}, ${current.temperatureF}°F`;
  }
  if (!previous.isThunderstorm && current.isThunderstorm) {
    return `Thunderstorm detected ahead — ${current.weatherLabel}`;
  }
  if (!previous.isFog && current.isFog) {
    return "Fog advisory — visibility reduced along your route";
  }
  if (current.windGustMph - previous.windGustMph >= 15) {
    return `Wind increasing — gusts now ${current.windGustMph} mph`;
  }
  if (current.isSevere && !previous.isSevere) {
    return `Severe weather — ${current.weatherLabel}. Consider rerouting.`;
  }
  return null;
}
