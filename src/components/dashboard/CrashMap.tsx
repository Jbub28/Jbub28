"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { CrashEvent } from "@/lib/types/crash";
import { severityToScore } from "@/lib/types/crash";
import "leaflet/dist/leaflet.css";

interface CrashMapProps {
  crashes: CrashEvent[];
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

function FitBounds({ crashes }: { crashes: CrashEvent[] }) {
  const map = useMap();
  useEffect(() => {
    if (crashes.length === 0) return;
    const points: LatLngExpression[] = crashes.map((c) => [c.latitude, c.longitude]);
    map.fitBounds(points as [number, number][], { padding: [40, 40], maxZoom: 12 });
  }, [map, crashes]);
  return null;
}

function getMapCenter(crashes: CrashEvent[]): LatLngExpression {
  if (crashes.length > 0) return [crashes[0].latitude, crashes[0].longitude];
  return [27.9506, -82.4572];
}

export function CrashMap({ crashes, highlightCenter }: CrashMapProps) {
  const center = highlightCenter
    ? [highlightCenter.lat, highlightCenter.lng] as LatLngExpression
    : getMapCenter(crashes);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds crashes={crashes} />

        {crashes.slice(0, 100).map((crash) => {
          const color = SEVERITY_COLORS[crash.severity] ?? "#6b7280";
          const radius = 4 + severityToScore(crash.severity) / 25;
          return (
            <CircleMarker
              key={crash.id}
              center={[crash.latitude, crash.longitude]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 1 }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{crash.road_name ?? "Unknown road"}</p>
                  <p>{new Date(crash.crash_datetime).toLocaleString()}</p>
                  <p className="capitalize">Severity: {crash.severity}</p>
                  {crash.fatality_count > 0 && (
                    <p className="text-red-600">{crash.fatality_count} fatality/fatalities</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
