import type { CurrentWeather, RadarMetadata } from "@/lib/types/weather";

const WEATHER_CACHE_KEY = "saferoute_weather_cache";
const RADAR_CACHE_KEY = "saferoute_radar_cache";
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedWeather {
  key: string;
  weather: CurrentWeather;
  cachedAt: number;
}

interface WeatherCacheStore {
  entries: CachedWeather[];
}

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function readStore(): WeatherCacheStore {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as WeatherCacheStore) : { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeStore(store: WeatherCacheStore) {
  if (typeof window === "undefined") return;
  const pruned = {
    entries: store.entries
      .filter((e) => Date.now() - e.cachedAt < CACHE_TTL_MS * 4)
      .slice(-50),
  };
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(pruned));
}

export function cacheWeather(lat: number, lng: number, weather: CurrentWeather) {
  const store = readStore();
  const key = coordKey(lat, lng);
  store.entries = store.entries.filter((e) => e.key !== key);
  store.entries.push({ key, weather: { ...weather, source: weather.source }, cachedAt: Date.now() });
  writeStore(store);
}

export function getCachedWeather(lat: number, lng: number): CurrentWeather | null {
  const store = readStore();
  const key = coordKey(lat, lng);
  const entry = store.entries.find((e) => e.key === key);
  if (!entry || Date.now() - entry.cachedAt > CACHE_TTL_MS * 2) return null;
  return { ...entry.weather, source: "cache" };
}

export async function fetchWeatherWithFallback(
  lat: number,
  lng: number,
  fetcher: (lat: number, lng: number) => Promise<CurrentWeather>
): Promise<CurrentWeather> {
  try {
    const weather = await fetcher(lat, lng);
    cacheWeather(lat, lng, weather);
    return weather;
  } catch {
    const cached = getCachedWeather(lat, lng);
    if (cached) return cached;
    throw new Error("Weather unavailable — using GPS-only mode");
  }
}

export function cacheRadar(meta: RadarMetadata) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RADAR_CACHE_KEY, JSON.stringify(meta));
}

export function getCachedRadar(): RadarMetadata | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RADAR_CACHE_KEY);
    return raw ? (JSON.parse(raw) as RadarMetadata) : null;
  } catch {
    return null;
  }
}
