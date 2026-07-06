"use client";

import { useState } from "react";
import type { CommonRoute, RoutePrediction, Trip } from "@/lib/types/driving";
import { predictRouteRisk } from "@/lib/risk/prediction";
import { saveRoutePrediction } from "@/lib/supabase/storage";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Navigation, Loader2 } from "lucide-react";

interface RoutePredictorProps {
  userId: string;
  trips: Trip[];
  commonRoutes: CommonRoute[];
  onPrediction?: (prediction: RoutePrediction) => void;
}

const RISK_STYLES = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export function RoutePredictor({
  userId,
  trips,
  commonRoutes,
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
      const prediction = predictRouteRisk({
        userId,
        originAddress: origin.trim(),
        destinationAddress: destination.trim(),
        plannedDate: date,
        plannedTime: time,
        trips,
        commonRoutes,
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
      subtitle="Enter a future trip to get a low / medium / high risk forecast"
    >
      <form onSubmit={handlePredict} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Origin"
            placeholder="e.g. 401 E Jackson St, Tampa"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
          <Input
            label="Destination"
            placeholder="e.g. Tampa International Airport"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Departure time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <Button type="submit" disabled={loading || trips.length === 0}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          Predict route risk
        </Button>

        {trips.length === 0 && (
          <p className="text-xs text-amber-600">
            Import driving history first so predictions use your personal patterns.
          </p>
        )}
      </form>

      {result && (
        <div className="mt-5 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${RISK_STYLES[result.risk_level]}`}
            >
              {result.risk_level} risk
            </span>
            <span className="text-sm text-slate-500">
              Score: {result.risk_score}/100
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {result.explanation}
          </p>
        </div>
      )}
    </Card>
  );
}
