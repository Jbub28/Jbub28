"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigationRoute } from "@/lib/mapbox/client";
import type { CrashEvent } from "@/lib/types/crash";
import type { RerouteRecommendation, RouteHazard } from "@/lib/types/hazard";
import { buildHazardCatalog, getHazardsAlongRoute } from "@/lib/risk/hazards";
import { findCrashesAlongPolyline } from "@/lib/risk/route-buffer";
import { evaluateRerouteNeed } from "@/lib/risk/reroute-advisor";
import type { CurrentWeather } from "@/lib/types/weather";
import type { LatLng } from "@/lib/geo";

const EMPTY_HAZARDS: RouteHazard[] = [];

interface UseRouteHazardMonitorOptions {
  enabled: boolean;
  position: LatLng | null;
  route: NavigationRoute | null;
  routeProgressIndex: number;
  crashes: CrashEvent[];
  externalHazards?: RouteHazard[];
  currentWeather?: CurrentWeather | null;
  pollIntervalMs?: number;
}

export function useRouteHazardMonitor({
  enabled,
  position,
  route,
  routeProgressIndex,
  crashes,
  externalHazards = EMPTY_HAZARDS,
  currentWeather = null,
  pollIntervalMs = 12000,
}: UseRouteHazardMonitorOptions) {
  const [tick, setTick] = useState(0);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [previousHazards, setPreviousHazards] = useState<RouteHazard[]>([]);
  const prevHazardsRef = useRef<RouteHazard[]>([]);
  const hazardsAheadRef = useRef<RouteHazard[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs]);

  const routeCrashes = useMemo(() => {
    if (!route || crashes.length === 0) return crashes;
    // Only scan crashes near the route — avoids processing thousands statewide.
    return findCrashesAlongPolyline(crashes, route.coordinates, 800).map((r) => r.item);
  }, [route, crashes]);

  const hazardsAhead = useMemo(() => {
    if (!enabled || !route) return [];
    const catalog = buildHazardCatalog(routeCrashes, externalHazards);
    return getHazardsAlongRoute(catalog, route.coordinates, 500, routeProgressIndex);
    // tick triggers re-scan on interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, route, routeProgressIndex, routeCrashes, externalHazards, tick]);

  hazardsAheadRef.current = hazardsAhead;

  // Snapshot previous hazards only on poll tick — not every render.
  useEffect(() => {
    if (!enabled || tick === 0) return;
    setPreviousHazards(prevHazardsRef.current);
    prevHazardsRef.current = hazardsAheadRef.current;
  }, [enabled, tick]);

  const recommendation = useMemo((): RerouteRecommendation | null => {
    if (!enabled || !position || !route) return null;

    const rec = evaluateRerouteNeed({
      position,
      route,
      routeProgressIndex,
      crashes: routeCrashes,
      externalHazards,
      previousHazards,
      currentWeather,
    });

    if (rec && rec.id === dismissedId) return null;
    return rec;
  }, [
    enabled,
    position,
    route,
    routeProgressIndex,
    routeCrashes,
    externalHazards,
    dismissedId,
    previousHazards,
    currentWeather,
  ]);

  const dismissRecommendation = () => {
    if (recommendation) setDismissedId(recommendation.id);
  };

  const clearDismissal = () => setDismissedId(null);

  return {
    recommendation,
    hazardsAhead,
    dismissRecommendation,
    clearDismissal,
  };
}
