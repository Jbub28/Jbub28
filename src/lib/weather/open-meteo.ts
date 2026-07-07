import type { CurrentWeather } from "@/lib/types/weather";

const WMO_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm with hail",
};

interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: OpenMeteoCurrent;
}

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function weatherCodeLabel(code: number): string {
  return WMO_LABELS[code] ?? "Unknown";
}

export function parseOpenMeteoResponse(
  data: OpenMeteoResponse,
  lat: number,
  lng: number,
  source: CurrentWeather["source"] = "open-meteo"
): CurrentWeather {
  const c = data.current;
  const code = c.weather_code;
  const isThunderstorm = code >= 95;
  const isFog = code === 45 || code === 48;
  const isRaining = (c.rain ?? 0) > 0 || [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code);
  const isSnowing = (c.snowfall ?? 0) > 0 || [71, 73, 75, 77, 85, 86].includes(code);
  const windGustMph = kmhToMph(c.wind_gusts_10m ?? c.wind_speed_10m);

  return {
    lat,
    lng,
    fetchedAt: new Date().toISOString(),
    source,
    temperatureF: Math.round(cToF(c.temperature_2m)),
    humidityPercent: c.relative_humidity_2m,
    precipitationMm: c.precipitation ?? 0,
    rainMm: c.rain ?? 0,
    windSpeedMph: Math.round(kmhToMph(c.wind_speed_10m)),
    windGustMph: Math.round(windGustMph),
    weatherCode: code,
    weatherLabel: weatherCodeLabel(code),
    isRaining,
    isSnowing,
    isFog,
    isThunderstorm,
    isSevere: isThunderstorm || code === 99 || windGustMph >= 45 || code === 65,
  };
}

export async function fetchCurrentWeather(
  lat: number,
  lng: number
): Promise<CurrentWeather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_gusts_10m` +
    `&wind_speed_unit=kmh&temperature_unit=celsius&precipitation_unit=mm&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = (await res.json()) as OpenMeteoResponse;
  return parseOpenMeteoResponse(data, lat, lng);
}

/** Sample weather along route (origin, midpoint, destination). */
export async function fetchRouteWeather(
  coordinates: [number, number][]
): Promise<CurrentWeather[]> {
  if (coordinates.length === 0) return [];

  const sampleIndices = new Set<number>([0, coordinates.length - 1]);
  if (coordinates.length > 2) {
    sampleIndices.add(Math.floor(coordinates.length / 2));
    sampleIndices.add(Math.floor(coordinates.length / 4));
    sampleIndices.add(Math.floor((coordinates.length * 3) / 4));
  }

  const points = Array.from(sampleIndices).map((i) => ({
    lat: coordinates[i][1],
    lng: coordinates[i][0],
  }));

  const results = await Promise.allSettled(
    points.map((p) => fetchCurrentWeather(p.lat, p.lng))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<CurrentWeather> => r.status === "fulfilled")
    .map((r) => r.value);
}
