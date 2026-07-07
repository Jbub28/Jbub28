"use client";

import dynamic from "next/dynamic";
import type { CrashEvent, RiskLevel } from "@/lib/types/crash";
import type { RouteGeometry } from "@/lib/mapbox/client";
import { isMapboxConfigured } from "@/lib/mapbox/client";
import { Card } from "@/components/ui/Card";

const CrashMapInner = dynamic(() => import("./CrashMap").then((m) => m.CrashMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
      Loading map…
    </div>
  ),
});

const MapboxMapInner = dynamic(() => import("./MapboxMap").then((m) => m.MapboxMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
      Loading Mapbox…
    </div>
  ),
});

interface MapCardProps {
  crashes: CrashEvent[];
  route?: RouteGeometry | null;
  routeRiskLevel?: RiskLevel;
  highlightCenter?: { lat: number; lng: number };
}

export function MapCard({ crashes, route, routeRiskLevel, highlightCenter }: MapCardProps) {
  const subtitle = route
    ? `Planned route shown · ${crashes.length} historic crashes`
    : `${crashes.length} Signal4 crash records`;

  return (
    <Card title="Route & crash map" subtitle={subtitle}>
      <div className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        {crashes.length === 0 && !route ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Predict a route or import crash CSV to see the map
          </div>
        ) : isMapboxConfigured() ? (
          <MapboxMapInner
            crashes={crashes}
            route={route}
            routeRiskLevel={routeRiskLevel}
            highlightCenter={highlightCenter}
          />
        ) : (
          <CrashMapInner crashes={crashes} highlightCenter={highlightCenter} />
        )}
      </div>
      {!isMapboxConfigured() && (
        <p className="mt-2 text-xs text-slate-500">
          Using OpenStreetMap fallback. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> for Mapbox routes and geocoding.
        </p>
      )}
    </Card>
  );
}
