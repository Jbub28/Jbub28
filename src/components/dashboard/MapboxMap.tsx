"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { CrashEvent, RiskLevel } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import type { RouteGeometry } from "@/lib/mapbox/client";
import { getMapboxToken, isMapboxConfigured } from "@/lib/mapbox/client";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
  crashes: CrashEvent[];
  route?: RouteGeometry | null;
  routeRiskLevel?: RiskLevel;
  highlightCenter?: { lat: number; lng: number };
}

const SEVERITY_COLORS: Record<string, string> = {
  fatal: "#dc2626",
  incapacitating: "#ea580c",
  "non-incapacitating": "#d97706",
  possible: "#ca8a04",
  none: "#65a30d",
  unknown: "#6b7280",
};

const ROUTE_COLORS: Record<RiskLevel, string> = {
  low: "#059669",
  medium: "#d97706",
  high: "#dc2626",
};

function getInitialView(crashes: CrashEvent[]) {
  if (crashes.length > 0) {
    return { latitude: crashes[0].latitude, longitude: crashes[0].longitude, zoom: 11 };
  }
  return { latitude: 27.9506, longitude: -82.4572, zoom: 11 };
}

export function MapboxMap({ crashes, route, routeRiskLevel = "medium", highlightCenter }: MapboxMapProps) {
  const mapRef = useRef<MapRef>(null);
  const token = getMapboxToken();
  const initialView = useMemo(() => getInitialView(crashes), [crashes]);

  const routeGeoJson = useMemo(() => {
    if (!route?.coordinates.length) return null;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: route.coordinates },
    };
  }, [route]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds: [number, number][] = [];
    crashes.forEach((c) => bounds.push([c.longitude, c.latitude]));
    if (route?.coordinates.length) bounds.push(...route.coordinates);

    if (bounds.length > 1) {
      const lngs = bounds.map((b) => b[0]);
      const lats = bounds.map((b) => b[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 48, maxZoom: 13, duration: 800 }
      );
    }
  }, [crashes, route]);

  if (!isMapboxConfigured() || !token) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <p className="font-medium">Mapbox not configured</p>
        <p>
          Add <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{" "}
          <code className="text-xs">.env.local</code> to enable route maps.
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 underline"
        >
          Get a free Mapbox token
        </a>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={initialView}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      {routeGeoJson && (
        <Source id="route" type="geojson" data={routeGeoJson}>
          <Layer
            id="route-line"
            type="line"
            paint={{
              "line-color": ROUTE_COLORS[routeRiskLevel],
              "line-width": 5,
              "line-opacity": 0.85,
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      {route && (
        <>
          <Marker latitude={route.origin.lat} longitude={route.origin.lng} anchor="bottom">
            <div className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow">A</div>
          </Marker>
          <Marker latitude={route.destination.lat} longitude={route.destination.lng} anchor="bottom">
            <div className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow">B</div>
          </Marker>
        </>
      )}

      {highlightCenter && (
        <Marker latitude={highlightCenter.lat} longitude={highlightCenter.lng} anchor="center">
          <div className="h-4 w-4 rounded-full border-2 border-white bg-amber-500 shadow" />
        </Marker>
      )}

      {crashes.slice(0, 150).map((crash) => {
        const color = SEVERITY_COLORS[crash.severity] ?? "#6b7280";
        const size = 8 + severityToScore(crash.severity) / 15;
        return (
          <Marker key={crash.id} latitude={crash.latitude} longitude={crash.longitude} anchor="center">
            <div
              title={crash.road_name ?? "Crash"}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            />
          </Marker>
        );
      })}
    </Map>
  );
}
