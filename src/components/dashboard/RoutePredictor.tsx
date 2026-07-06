"use client";

import { useState } from "react";
import type { CrashEvent, HighRiskCorridor, RoutePrediction } from "@/lib/types/crash";
import { predictRouteRisk } from "@/lib/risk/prediction";
import { saveRoutePrediction } from "@/lib/supabase/storage";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Navigation, Loader2 } from "lucide-react";

interface RoutePredictorProps {
  userId: string;
  crashes: CrashEvent[];
  corridors: HighRiskCorridor[];
  onPrediction?: (prediction: RoutePrediction) => void;
}

const RISK_STYLES = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

// Tampa-area geocoding hints for common roads
const ROAD_COORDS: Record<string, { lat: number; lng: number }> = {
  "i-275": { lat: 27.965, lng: -82.49 },
  "dale mabry": { lat: 27.94, lng: -82.506 },
  "kennedy": { lat: 27.948, lng: -82.459 },
  "westshore": { lat: 27.944, lng: -82.524 },
  "fowler": { lat: 28.055, lng: -82.413 },
  "brandon": { lat: 27.938, lng: -82.286 },
  "airport": { lat: 27.976, lng: -82.533 },
  "downtown": { lat: 27.948, lng: -82.459 },
  "hyde park": { lat: 27.938, lng: -82.482 },
  "st pete": { lat: 27.768, lng: -82.64 },
  "howard frankland": { lat: 27.966, lng: -82.55 },
};

function geocodeHint(address: string): { lat?: number; lng?: number } {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(ROAD_COORDS)) {
    if (lower.includes(key)) return coords;
  }
  return {};
}

export function RoutePredictor({
  userId,
  crashes,
  corridors,
  onPrediction,
}: RoutePredictorProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("08:00");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoutePrediction | null>(null);

  async function handlePredict(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    setLoading(true);
    try {
      const originCoords = geocodeHint(origin);
      const destCoords = geocodeHint(destination);

      const prediction = predictRouteRisk({
        userId,
        originAddress: origin.trim(),
        destinationAddress: destination.trim(),
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destLat: destCoords.lat,
        destLng: destCoords.lng,
        plannedDate: date,
        plannedTime: time,
        crashes,
        corridors,
      });

      await saveRoutePrediction(prediction);
      setResult(prediction);
      onPrediction?.(prediction);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Route risk predictor"
      subtitle="Predict low / medium / high risk using Signal4 historic crash data"
    >
      <form onSubmit={handlePredict} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Origin" placeholder="e.g. Dale Mabry Hwy, Tampa" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          <Input label="Destination" placeholder="e.g. I-275 & Kennedy Blvd" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Departure time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>

        <Button type="submit" disabled={loading || crashes.length === 0}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Predict route risk
        </Button>

        {crashes.length === 0 && (
          <p className="text-xs text-amber-600">
            Import Signal4 crash data first to enable historic route predictions.
          </p>
        )}
      </form>

      {result && (
        <div className="mt-5 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${RISK_STYLES[result.risk_level]}`}>
              {result.risk_level} risk
            </span>
            <span className="text-sm text-slate-500">Score: {result.risk_score}/100</span>
            <span className="text-sm text-slate-500">{result.nearby_crash_count} nearby historic crashes</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{result.explanation}</p>
        </div>
      )}
    </Card>
  );
}
