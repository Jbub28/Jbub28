"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Trip } from "@/lib/types/driving";
import "leaflet/dist/leaflet.css";

interface TripMapProps {
  trips: Trip[];
  highlightRoute?: { waypoints: { lat: number; lng: number }[] };
}

function getMapCenter(trips: Trip[]): LatLngExpression {
  for (const trip of trips) {
    if (trip.start_lat && trip.start_lng) return [trip.start_lat, trip.start_lng];
    if (trip.route_polyline[0]) {
      return [trip.route_polyline[0].lat, trip.route_polyline[0].lng];
    }
  }
  return [27.9506, -82.4572];
}

function FitBounds({ trips }: { trips: Trip[] }) {
  const map = useMap();

  useEffect(() => {
    const points: LatLngExpression[] = [];
    for (const trip of trips) {
      if (trip.route_polyline.length > 0) {
        trip.route_polyline.forEach((p) => points.push([p.lat, p.lng]));
      } else if (trip.start_lat && trip.start_lng) {
        points.push([trip.start_lat, trip.start_lng]);
        if (trip.end_lat && trip.end_lng) {
          points.push([trip.end_lat, trip.end_lng]);
        }
      }
    }
    if (points.length > 0) {
      map.fitBounds(points as [number, number][], { padding: [40, 40], maxZoom: 13 });
    }
  }, [map, trips]);

  return null;
}

const ROUTE_COLORS = ["#059669", "#0d9488", "#0891b2", "#2563eb", "#7c3aed"];

export function TripMap({ trips, highlightRoute }: TripMapProps) {
  const center = getMapCenter(trips);
  const recentTrips = trips.slice(0, 15);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <MapContainer
        center={center}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds trips={trips} />

        {highlightRoute && highlightRoute.waypoints.length > 1 && (
          <Polyline
            positions={highlightRoute.waypoints.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.9 }}
          />
        )}

        {recentTrips.map((trip, idx) => {
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          if (trip.route_polyline.length > 1) {
            return (
              <Polyline
                key={trip.id}
                positions={trip.route_polyline.map((p) => [p.lat, p.lng])}
                pathOptions={{ color, weight: 3, opacity: 0.7 }}
              />
            );
          }
          if (trip.start_lat && trip.start_lng) {
            return (
              <CircleMarker
                key={trip.id}
                center={[trip.start_lat, trip.start_lng]}
                radius={6}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-medium">
                      {new Date(trip.start_time).toLocaleString()}
                    </p>
                    {trip.distance_miles && <p>{trip.distance_miles} mi</p>}
                    {trip.time_of_day && (
                      <p className="capitalize">{trip.time_of_day}</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}
