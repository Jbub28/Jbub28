"use client";

import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { CrashEvent } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import type { NavigationRoute } from "@/lib/mapbox/client";
import { getMapboxToken, isMapboxConfigured } from "@/lib/mapbox/client";
import type { LatLng } from "@/lib/geo";
import { bearingDegrees } from "@/lib/geo";
import {
  buildRouteHeatmapPoints,
  heatmapPointsToGeoJSON,
} from "@/lib/risk/route-heatmap";
import type { RouteHazard } from "@/lib/types/hazard";
import "mapbox-gl/dist/mapbox-gl.css";

interface NavigationMapProps {
  route: NavigationRoute;
  userPosition?: LatLng | null;
  userHeading?: number | null;
  routeProgressIndex?: number;
  followUser?: boolean;
  crashes?: CrashEvent[];
  showCrashOverlay?: boolean;
  showHeatmap?: boolean;
  hazards?: RouteHazard[];
}

const SEVERITY_COLORS: Record<string, string> = {
  fatal: "#dc2626",
  incapacitating: "#ea580c",
  "non-incapacitating": "#d97706",
  possible: "#ca8a04",
  none: "#65a30d",
  unknown: "#6b7280",
};

const HAZARD_COLORS: Record<string, string> = {
  low: "#65a30d",
  medium: "#d97706",
  high: "#ea580c",
  critical: "#dc2626",
};

function splitRoute(
  coordinates: [number, number][],
  progressIndex: number
): { traveled: [number, number][]; remaining: [number, number][] } {
  if (progressIndex <= 0) return { traveled: [], remaining: coordinates };
  const idx = Math.min(progressIndex, coordinates.length - 1);
  return {
    traveled: coordinates.slice(0, idx + 1),
    remaining: coordinates.slice(idx),
  };
}

export function NavigationMap({
  route,
  userPosition,
  userHeading,
  routeProgressIndex = 0,
  followUser = false,
  crashes = [],
  showCrashOverlay = false,
  showHeatmap = false,
  hazards = [],
}: NavigationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const token = getMapboxToken();

  const { traveled, remaining } = useMemo(
    () => splitRoute(route.coordinates, routeProgressIndex),
    [route.coordinates, routeProgressIndex]
  );

  const heatmapGeoJson = useMemo(() => {
    if (!showHeatmap || crashes.length === 0) return null;
    const points = buildRouteHeatmapPoints(crashes, route.coordinates, 600);
    return heatmapPointsToGeoJSON(points);
  }, [showHeatmap, crashes, route.coordinates]);

  const traveledGeoJson = useMemo(
    () =>
      traveled.length > 1
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: traveled },
          }
        : null,
    [traveled]
  );

  const remainingGeoJson = useMemo(
    () =>
      remaining.length > 1
        ? {
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: remaining },
          }
        : null,
    [remaining]
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !followUser || !userPosition) return;

    const bearing =
      userHeading ??
      (routeProgressIndex < route.coordinates.length - 1
        ? bearingDegrees(userPosition, {
            lat: route.coordinates[routeProgressIndex + 1][1],
            lng: route.coordinates[routeProgressIndex + 1][0],
          })
        : 0);

    map.easeTo({
      center: [userPosition.lng, userPosition.lat],
      bearing,
      pitch: 55,
      zoom: 16,
      duration: 800,
    });
  }, [followUser, userPosition, userHeading, routeProgressIndex, route.coordinates]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || followUser) return;

    const bounds: [number, number][] = [...route.coordinates];
    if (userPosition) bounds.push([userPosition.lng, userPosition.lat]);

    if (bounds.length > 1) {
      const lngs = bounds.map((b) => b[0]);
      const lats = bounds.map((b) => b[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 14, duration: 600 }
      );
    }
  }, [route.coordinates, userPosition, followUser]);

  if (!isMapboxConfigured() || !token) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 p-6 text-center text-sm text-slate-300">
        Mapbox token required for navigation.
      </div>
    );
  }

  const initialCenter = userPosition ?? {
    lat: route.origin.lat,
    lng: route.origin.lng,
  };

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{
        latitude: initialCenter.lat,
        longitude: initialCenter.lng,
        zoom: followUser ? 16 : 12,
        pitch: followUser ? 55 : 0,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/navigation-day-v1"
    >
      {heatmapGeoJson && heatmapGeoJson.features.length > 0 && (
        <Source id="risk-heat" type="geojson" data={heatmapGeoJson}>
          <Layer
            id="risk-heat-layer"
            type="heatmap"
            paint={{
              "heatmap-weight": ["get", "weight"],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.4],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 14, 28],
              "heatmap-opacity": 0.75,
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(34,197,94,0)",
                0.25,
                "rgba(34,197,94,0.35)",
                0.5,
                "rgba(234,179,8,0.55)",
                0.75,
                "rgba(249,115,22,0.75)",
                1,
                "rgba(220,38,38,0.9)",
              ],
            }}
          />
        </Source>
      )}

      {traveledGeoJson && (
        <Source id="route-traveled" type="geojson" data={traveledGeoJson}>
          <Layer
            id="route-traveled-line"
            type="line"
            paint={{ "line-color": "#94a3b8", "line-width": 6, "line-opacity": 0.7 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      {remainingGeoJson && (
        <Source id="route-remaining" type="geojson" data={remainingGeoJson}>
          <Layer
            id="route-remaining-line"
            type="line"
            paint={{ "line-color": "#2563eb", "line-width": 7, "line-opacity": 0.95 }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      <Marker latitude={route.destination.lat} longitude={route.destination.lng} anchor="bottom">
        <div className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
          B
        </div>
      </Marker>

      {userPosition && (
        <Marker latitude={userPosition.lat} longitude={userPosition.lng} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-10 w-10 rounded-full bg-blue-500/25" />
            <div
              className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg"
              style={
                userHeading != null ? { transform: `rotate(${userHeading}deg)` } : undefined
              }
            />
          </div>
        </Marker>
      )}

      {hazards.slice(0, 20).map((hazard) => (
        <Marker key={hazard.id} latitude={hazard.lat} longitude={hazard.lng} anchor="center">
          <div
            title={hazard.title}
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg"
            style={{ backgroundColor: HAZARD_COLORS[hazard.severity] ?? "#d97706" }}
          >
            {hazard.type === "active_crash" ? "!" : "•"}
          </div>
        </Marker>
      ))}

      {showCrashOverlay &&
        !showHeatmap &&
        crashes.slice(0, 80).map((crash) => {
          const color = SEVERITY_COLORS[crash.severity] ?? "#6b7280";
          const size = 6 + severityToScore(crash.severity) / 20;
          return (
            <Marker key={crash.id} latitude={crash.latitude} longitude={crash.longitude} anchor="center">
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: "1px solid white",
                  opacity: 0.85,
                }}
              />
            </Marker>
          );
        })}
    </Map>
  );
}
