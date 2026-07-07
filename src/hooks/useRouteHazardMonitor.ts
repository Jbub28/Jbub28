"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigationRoute } from "@/lib/mapbox/client";
import type { CrashEvent } from "@/lib/types/crash";
import type { RerouteRecommendation, RouteHazard } from "@/lib/types/hazard";
import { buildHazardCatalog, getHazardsAlongRoute } from "@/lib/risk/hazards";
import { evaluateRerouteNeed } from "@/lib/risk/reroute-advisor";
import type { LatLng } from "@/lib/geo";

interface UseRouteHazardMonitorOptions {
  enabled: boolean;
  position: LatLng | null;
  route: NavigationRoute | null;
  routeProgressIndex: number;
  crashes: CrashEvent[];
  externalHazards?: RouteHazard[];
  pollIntervalMs?: number;
}

export function useRouteHazardMonitor({
  enabled,
  position,
  route,
  routeProgressIndex,
  crashes,
  externalHazards = [],
  pollIntervalMs = 12000,
}: UseRouteHazardMonitorOptions) {
  const [tick, setTick] = useState(0);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [previousHazards, setPreviousHazards] = useState<RouteHazard[]>([]);
  const prevHazardsRef = useRef<RouteHazard[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs]);

  const hazardsAhead = useMemo(() => {
    if (!enabled || !route) return [];
    const catalog = buildHazardCatalog(crashes, externalHazards);
    return getHazardsAlongRoute(catalog, route.coordinates, 500, routeProgressIndex);
    // tick triggers re-scan on interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, route, routeProgressIndex, crashes, externalHazards, tick]);

  useEffect(() => {
    setPreviousHazards(prevHazardsRef.current);
    prevHazardsRef.current = hazardsAhead;
  }, [hazardsAhead, tick]);

  const recommendation = useMemo((): RerouteRecommendation | null => {
    if (!enabled || !position || !route) return null;

    const rec = evaluateRerouteNeed({
      position,
      route,
      routeProgressIndex,
      crashes,
      externalHazards,
      previousHazards,
    });

    if (rec && rec.id === dismissedId) return null;
    return rec;
  }, [
    enabled,
    position,
    route,
    routeProgressIndex,
    crashes,
    externalHazards,
    dismissedId,
    previousHazards,
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
