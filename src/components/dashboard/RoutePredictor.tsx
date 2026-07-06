"use client";

import { useState } from "react";
import type { Signal4StateReport } from "@/lib/types/signal4-report";
import type { CrashEvent, HighRiskCorridor, RoutePrediction } from "@/lib/types/crash";
import { predictRouteRisk } from "@/lib/risk/prediction";
import { saveRoutePrediction } from "@/lib/supabase/storage";
import {
  geocodeHint,
  isMapboxConfigured,
  resolveRouteFromAddresses,
  type RouteGeometry,
} from "@/lib/mapbox/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Navigation, Loader2 } from "lucide-react";

interface RoutePredictorProps {
  userId: string;
  crashes: CrashEvent[];
  corridors: HighRiskCorridor[];
  stateReport?: Signal4StateReport | null;
  onPrediction?: (prediction: RoutePrediction) => void;
  onRouteResolved?: (route: RouteGeometry | null, prediction: RoutePrediction) => void;
}

const RISK_STYLES = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export function RoutePredictor({
  userId,
  crashes,
  corridors,
  stateReport,
  onPrediction,
  onRouteResolved,
}: RoutePredictorProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("08:00");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoutePrediction | null>(null);
  const [routeInfo, setRouteInfo] = useState<string | null>(null);

  async function handlePredict(e: React.FormEvent) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    setLoading(true);
    setRouteInfo(null);
    try {
      let originLat: number | undefined;
      let originLng: number | undefined;
      let destLat: number | undefined;
      let destLng: number | undefined;
      let route: RouteGeometry | null = null;

      if (isMapboxConfigured()) {
        const resolved = await resolveRouteFromAddresses(origin.trim(), destination.trim());
        originLat = resolved.origin.lat;
        originLng = resolved.origin.lng;
        destLat = resolved.destination.lat;
        destLng = resolved.destination.lng;
        route = resolved.route;
        if (route?.distanceMiles) {
          setRouteInfo(
            `${route.distanceMiles.toFixed(1)} mi · ~${route.durationMinutes} min via Mapbox`
          );
        }
      } else {
        const o = geocodeHint(origin);
        const d = geocodeHint(destination);
        originLat = o?.lat;
        originLng = o?.lng;
        destLat = d?.lat;
        destLng = d?.lng;
      }

      const prediction = predictRouteRisk({
        userId,
        originAddress: origin.trim(),
        destinationAddress: destination.trim(),
        originLat,
        originLng,
        destLat,
        destLng,
        plannedDate: date,
        plannedTime: time,
        crashes,
        corridors,
        stateReport,
      });

      await saveRoutePrediction(prediction);
      setResult(prediction);
      onPrediction?.(prediction);
      onRouteResolved?.(route, prediction);
    } catch (err) {
      setRouteInfo(err instanceof Error ? err.message : "Failed to resolve route");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Route risk predictor"
      subtitle="Mapbox routing + Signal4 historic crash risk"
    >
      <form onSubmit={handlePredict} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Origin" placeholder="e.g. Dale Mabry Hwy, Tampa, FL" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          <Input label="Destination" placeholder="e.g. Tampa International Airport" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Departure time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>

        <Button type="submit" disabled={loading || (!stateReport && crashes.length === 0)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Predict route risk
        </Button>

        {routeInfo && <p className="text-xs text-slate-500">{routeInfo}</p>}

        {crashes.length === 0 && !stateReport && (
          <p className="text-xs text-amber-600">
            Import the Florida Traffic Safety Report (PDF) or Signal4 crash CSV to enable predictions.
          </p>
        )}
        {stateReport && crashes.length === 0 && (
          <p className="text-xs text-emerald-600">
            Statewide Signal4 report loaded — predictions use Florida day-of-week and emphasis-area patterns.
          </p>
        )}
        {!isMapboxConfigured() && (
          <p className="text-xs text-slate-500">
            Add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to draw routes on the map and geocode addresses.
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
