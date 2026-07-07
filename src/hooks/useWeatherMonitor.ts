"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";
import type { CurrentWeather, RouteWeatherSnapshot } from "@/lib/types/weather";
import { fetchCurrentWeather, fetchRouteWeather } from "@/lib/weather/open-meteo";
import { fetchWeatherWithFallback } from "@/lib/weather/cache";
import {
  assessRouteWeather,
  assessWeatherRisk,
  detectWeatherChange,
  historicWeatherMatchBoost,
} from "@/lib/weather/risk";
import type { CrashEvent } from "@/lib/types/crash";
import type { NavigationRoute } from "@/lib/mapbox/client";

interface UseWeatherMonitorOptions {
  enabled: boolean;
  position: LatLng | null;
  route: NavigationRoute | null;
  crashes: CrashEvent[];
  pollIntervalMs?: number;
  onWeatherChange?: (message: string, weather: CurrentWeather) => void;
  onSevereWeather?: (weather: CurrentWeather, recommendation: string) => void;
}

export function useWeatherMonitor({
  enabled,
  position,
  route,
  crashes,
  pollIntervalMs = 180000,
  onWeatherChange,
  onSevereWeather,
}: UseWeatherMonitorOptions) {
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [routeWeather, setRouteWeather] = useState<RouteWeatherSnapshot | null>(null);
  const [routeWeatherTick, setRouteWeatherTick] = useState(0);
  const previousWeatherRef = useRef<CurrentWeather | null>(null);

  useEffect(() => {
    if (!enabled || !route) return;
    const timer = setInterval(() => setRouteWeatherTick((t) => t + 1), 300000);
    return () => clearInterval(timer);
  }, [enabled, route]);

  useEffect(() => {
    if (!enabled || !route) return;

    let cancelled = false;
    (async () => {
      try {
        const along = await fetchRouteWeather(route.coordinates);
        if (cancelled) return;
        const aggregate = assessRouteWeather(along);
        const origin = along[0] ?? null;
        const destination = along[along.length - 1] ?? null;

        if (origin) {
          const match = historicWeatherMatchBoost(crashes, route.coordinates, origin);
          if (match.boost > 0) {
            aggregate.score = Math.min(100, aggregate.score + match.boost);
            aggregate.factors.push(match.detail);
          }
        }

        setRouteWeather({
          origin,
          destination,
          alongRoute: along,
          aggregate,
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        if (!cancelled) setRouteWeather(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, route, crashes, routeWeatherTick]);

  useEffect(() => {
    if (!enabled || !position) return;

    let cancelled = false;

    async function poll() {
      try {
        const weather = await fetchWeatherWithFallback(
          position!.lat,
          position!.lng,
          fetchCurrentWeather
        );
        if (cancelled) return;

        const change = detectWeatherChange(previousWeatherRef.current, weather);
        if (change) onWeatherChange?.(change, weather);

        const assessment = assessWeatherRisk(weather);
        if (
          (assessment.severity === "severe" || assessment.severity === "high") &&
          assessment.recommendation
        ) {
          onSevereWeather?.(weather, assessment.recommendation);
        }

        previousWeatherRef.current = weather;
        setCurrentWeather(weather);
      } catch {
        // GPS-only mode — position still works
      }
    }

    poll();
    const timer = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, position, pollIntervalMs, onWeatherChange, onSevereWeather]);

  return { currentWeather, routeWeather, loading: false };
}
