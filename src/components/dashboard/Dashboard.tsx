"use client";

import { useCallback, useEffect, useState } from "react";
import type { AreaRiskScore, CrashEvent, HighRiskCorridor, RoutePrediction } from "@/lib/types/crash";
import { extractPatternInsights } from "@/lib/risk/scoring";
import {
  fetchCorridors,
  fetchCrashes,
  fetchLatestAreaRiskScore,
  fetchRoutePredictions,
  getStorageMode,
  getUserId,
} from "@/lib/supabase/storage";
import { seedSignal4SampleData } from "@/lib/seed-signal4";
import { DataImport } from "./DataImport";
import { CrashMapCard } from "./CrashMapCard";
import { RiskScoreCard } from "./RiskScoreCard";
import { HighRiskCorridors } from "./HighRiskCorridors";
import { RiskPatterns } from "./RiskPatterns";
import { RoutePredictor } from "./RoutePredictor";
import { Card } from "@/components/ui/Card";
import { MapPin, History, Database } from "lucide-react";

export function Dashboard() {
  const [crashes, setCrashes] = useState<CrashEvent[]>([]);
  const [corridors, setCorridors] = useState<HighRiskCorridor[]>([]);
  const [score, setScore] = useState<AreaRiskScore | null>(null);
  const [predictions, setPredictions] = useState<RoutePrediction[]>([]);
  const [userId, setUserId] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState<HighRiskCorridor | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await getUserId();
      setUserId(uid);
      const [c, r, s, p] = await Promise.all([
        fetchCrashes("signal4"),
        fetchCorridors("signal4"),
        fetchLatestAreaRiskScore("signal4"),
        fetchRoutePredictions(),
      ]);
      setCrashes(c);
      setCorridors(r);
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

        let c = await fetchCrashes("signal4");
        const shouldSeed =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("demo") &&
          c.length === 0;

        if (shouldSeed) {
          await seedSignal4SampleData();
          c = await fetchCrashes("signal4");
        }

        const [r, s, p] = await Promise.all([
          fetchCorridors("signal4"),
          fetchLatestAreaRiskScore("signal4"),
          fetchRoutePredictions(),
        ]);
        if (cancelled) return;
        setCrashes(c);
        setCorridors(r);
        setScore(s);
        setPredictions(p);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const insights = extractPatternInsights(crashes);
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
              Route Risk Predictor
            </h1>
            <p className="text-sm text-slate-500">
              Powered by Signal4 Analytics · {crashes.length} historic crashes loaded
              {storageMode === "local" && " · local storage"}
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Import historic crash data from{" "}
          <a href="https://signal4analytics.com" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">
            Signal4 Analytics
          </a>{" "}
          to map high-risk corridors and predict whether a future route is low, medium, or high risk.
        </p>
      </header>

      {loading && crashes.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : (
        <>
          <RoutePredictor
            userId={userId}
            crashes={crashes}
            corridors={corridors}
            onPrediction={(p) => setPredictions((prev) => [p, ...prev])}
          />

          <DataImport onImportComplete={refresh} />

          <RiskScoreCard score={score} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CrashMapCard
                crashes={crashes}
                highlightCenter={selectedCorridor?.center}
              />
            </div>
            <HighRiskCorridors
              corridors={corridors}
              selectedId={selectedCorridor?.id}
              onSelect={setSelectedCorridor}
            />
          </div>

          <RiskPatterns insights={insights} />

          {predictions.length > 0 && (
            <Card title="Recent predictions" subtitle="Route forecasts from Signal4 historic data">
              <ul className="space-y-3">
                {predictions.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <History className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{p.origin_address} → {p.destination_address}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        p.risk_level === "low" ? "bg-emerald-100 text-emerald-700"
                          : p.risk_level === "medium" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>{p.risk_level}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.planned_date} at {p.planned_time} · {p.nearby_crash_count} nearby crashes
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Data source" subtitle="Florida statewide crash analytics">
            <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <p>
                Crash data comes from{" "}
                <a href="https://signal4analytics.com" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">
                  Signal4 Analytics
                </a>
                , Florida&apos;s statewide crash mapping platform (UF GeoPlan Center / FDOT).
                Download CSV exports via Event Analysis and upload them here. Future versions can
                layer in TECO fleet accident data alongside Signal4 records.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
