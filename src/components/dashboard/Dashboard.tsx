"use client";

import { useCallback, useEffect, useState } from "react";
import type { AreaRiskScore, CrashEvent, HighRiskCorridor, RoutePrediction } from "@/lib/types/crash";
import { extractPatternInsights } from "@/lib/risk/scoring";
import {
  fetchLatestAreaRiskScore,
  fetchRoutePredictions,
  getStorageMode,
  getUserId,
} from "@/lib/supabase/storage";
import type { Signal4StateReport } from "@/lib/types/signal4-report";
import { ensureStateReport } from "@/lib/supabase/state-report";
import { useSignal4LiveFeed } from "@/hooks/useSignal4LiveFeed";
import { StateReportCard } from "./StateReportCard";
import { DataImport } from "./DataImport";
import { Signal4LiveFeed } from "./Signal4LiveFeed";
import type { RouteGeometry } from "@/lib/mapbox/client";
import { MapCard } from "./MapCard";
import { RiskScoreCard } from "./RiskScoreCard";
import { HighRiskCorridors } from "./HighRiskCorridors";
import { RiskPatterns } from "./RiskPatterns";
import { RoutePredictor } from "./RoutePredictor";
import { Card } from "@/components/ui/Card";
import { MapPin, History, Database, Navigation } from "lucide-react";
import Link from "next/link";

export function Dashboard() {
  const {
    crashes,
    corridors,
    analytics,
    loading: liveLoading,
    syncing,
    error: liveError,
    refresh: refreshLive,
  } = useSignal4LiveFeed({ enabled: true });

  const [score, setScore] = useState<AreaRiskScore | null>(null);
  const [predictions, setPredictions] = useState<RoutePrediction[]>([]);
  const [userId, setUserId] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState<HighRiskCorridor | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteGeometry | null>(null);
  const [activeRouteRisk, setActiveRouteRisk] = useState<RoutePrediction["risk_level"] | undefined>();
  const [stateReport, setStateReport] = useState<Signal4StateReport | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await getUserId();
      setUserId(uid);
      const [s, p] = await Promise.all([
        fetchLatestAreaRiskScore("signal4"),
        fetchRoutePredictions(),
      ]);
      setScore(s);
      setPredictions(p);
      await refreshLive();
    } finally {
      setLoading(false);
    }
  }, [refreshLive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const uid = await getUserId();
        if (cancelled) return;
        setUserId(uid);

        const report = await ensureStateReport(uid);
        if (cancelled) return;
        setStateReport(report);

        const [s, p] = await Promise.all([
          fetchLatestAreaRiskScore("signal4"),
          fetchRoutePredictions(),
        ]);
        if (cancelled) return;
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Route Risk Insights
            </h1>
            <p className="text-sm text-slate-500">
              Live Signal4 Analytics · Florida statewide
              {crashes.length > 0 && ` · ${crashes.length} map points`}
              {storageMode === "local" && " · local cache"}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Navigation className="h-4 w-4" />
            Open GPS Nav
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Crash analytics stream live from{" "}
          <a href="https://signal4analytics.com" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">
            Signal4 Analytics
          </a>
          . Map serious-injury and fatal crash points, identify high-risk corridors, and score routes — no CSV required.
        </p>
      </header>

      {loading && liveLoading && !stateReport ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Loading dashboard…
        </div>
      ) : (
        <>
          <Signal4LiveFeed
            analytics={analytics}
            loading={liveLoading}
            syncing={syncing}
            error={liveError}
            onRefresh={() => void refreshLive()}
          />

          <RoutePredictor
            userId={userId}
            crashes={crashes}
            corridors={corridors}
            stateReport={stateReport}
            onPrediction={(p) => setPredictions((prev) => [p, ...prev])}
            onRouteResolved={(route, prediction) => {
              setActiveRoute(route);
              setActiveRouteRisk(prediction.risk_level);
            }}
          />

          <StateReportCard report={stateReport} />

          <DataImport onImportComplete={refresh} />

          <RiskScoreCard score={score} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MapCard
                crashes={crashes}
                route={activeRoute}
                routeRiskLevel={activeRouteRisk}
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
                Live crash map points and statewide totals are pulled from the public{" "}
                <a href="https://signal4analytics.com" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">
                  Signal4 Analytics
                </a>{" "}
                dashboard (UF GeoPlan Center / FDOT), updated daily from FLHSMV. Optional CSV/PDF
                uploads can supplement the live feed with detailed historic exports.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
