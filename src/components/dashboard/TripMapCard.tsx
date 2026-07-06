"use client";

import dynamic from "next/dynamic";
import type { Trip } from "@/lib/types/driving";
import { Card } from "@/components/ui/Card";

const TripMapInner = dynamic(
  () => import("./TripMap").then((m) => m.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
        Loading map…
      </div>
    ),
  }
);

interface TripMapCardProps {
  trips: Trip[];
  highlightRoute?: { waypoints: { lat: number; lng: number }[] };
}

export function TripMapCard({ trips, highlightRoute }: TripMapCardProps) {
  return (
    <Card
      title="Your trips on the map"
      subtitle={`Showing ${Math.min(trips.length, 15)} recent trips`}
    >
      {trips.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-600">
          Import your driving history to see trips on the map
        </div>
      ) : (
        <TripMapInner trips={trips} highlightRoute={highlightRoute} />
      )}
    </Card>
  );
}
