"use client";

import { useCallback, useEffect, useState } from "react";
import type { CommonRoute, RiskScore, RoutePrediction, Trip } from "@/lib/types/driving";
import { extractPatternInsights } from "@/lib/risk/scoring";
import {
  fetchCommonRoutes,
  fetchLatestRiskScore,
  fetchRoutePredictions,
  fetchTrips,
  getStorageMode,
  getUserId,
} from "@/lib/supabase/storage";
import { seedDemoData } from "@/lib/seed-demo";
import { DataImport } from "./DataImport";
import { TripMapCard } from "./TripMapCard";
import { RiskScoreCard } from "./RiskScoreCard";
import { CommonRoutes } from "./CommonRoutes";
import { RiskPatterns } from "./RiskPatterns";
import { RoutePredictor } from "./RoutePredictor";
import { Card } from "@/components/ui/Card";
import { MapPin, History, Truck } from "lucide-react";

export function Dashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<CommonRoute[]>([]);
  const [score, setScore] = useState<RiskScore | null>(null);
  const [predictions, setPredictions] = useState<RoutePrediction[]>([]);
  const [userId, setUserId] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<CommonRoute | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await getUserId();
      setUserId(uid);
      const [t, r, s, p] = await Promise.all([
        fetchTrips("personal"),
        fetchCommonRoutes("personal"),
        fetchLatestRiskScore("personal"),
        fetchRoutePredictions(),
      ]);
      setTrips(t);
      setRoutes(r);
      setScore(s);
      setPredictions(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const uid = await getUserId();
        if (cancelled) return;
        setUserId(uid);

        let t = await fetchTrips("personal");
        const shouldSeed =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("demo") &&
          t.length === 0;

        if (shouldSeed) {
          await seedDemoData();
          t = await fetchTrips("personal");
        }

        const [r, s, p] = await Promise.all([
          fetchCommonRoutes("personal"),
          fetchLatestRiskScore("personal"),
          fetchRoutePredictions(),
        ]);
        if (cancelled) return;
        setTrips(t);
        setRoutes(r);
        setScore(s);
        setPredictions(p);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const insights = extractPatternInsights(trips);
  const storageMode = getStorageMode();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Personal Route Risk Predictor
            </h1>
            <p className="text-sm text-slate-500">
              Your personal driving dashboard · {trips.length} trips loaded
              {storageMode === "local" && " · demo mode (local storage)"}
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Import Google Maps Timeline and GEICO DriveEasy data to map your trips,
          find common routes, surface risky patterns, and predict risk for future drives.
          Architecture supports future TECO fleet accident data integration.
        </p>
      </header>

      {loading && trips.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : (
        <>
          <DataImport onImportComplete={refresh} />

          <RiskScoreCard score={score} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TripMapCard
                trips={trips}
                highlightRoute={
                  selectedRoute
                    ? { waypoints: selectedRoute.waypoints }
                    : undefined
                }
              />
            </div>
            <CommonRoutes
              routes={routes}
              selectedId={selectedRoute?.id}
              onSelect={setSelectedRoute}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RiskPatterns insights={insights} />
            <RoutePredictor
              userId={userId}
              trips={trips}
              commonRoutes={routes}
              onPrediction={(p) => setPredictions((prev) => [p, ...prev])}
            />
          </div>

          {predictions.length > 0 && (
            <Card title="Recent predictions" subtitle="Saved route risk forecasts">
              <ul className="space-y-3">
                {predictions.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <History className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">
                        {p.origin_address} → {p.destination_address}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          p.risk_level === "low"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.risk_level === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.risk_level}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.planned_date} at {p.planned_time}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title="Future expansion: TECO fleet data"
            subtitle="Schema ready for fleet accident integration"
          >
            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <p>
                The database includes <code>fleet_vehicles</code> and{" "}
                <code>fleet_accidents</code> tables with a <code>data_source</code> field
                on all trip records. Personal and fleet data stay separated so TECO
                accident history can be layered in without changing the personal dashboard.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
