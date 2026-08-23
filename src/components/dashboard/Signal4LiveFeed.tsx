"use client";

import { RefreshCw, Radio, AlertCircle, CheckCircle } from "lucide-react";
import type { Signal4LiveAnalytics } from "@/lib/signal4/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Signal4LiveFeedProps {
  analytics: Signal4LiveAnalytics | null;
  loading?: boolean;
  syncing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function Signal4LiveFeed({
  analytics,
  loading,
  syncing,
  error,
  onRefresh,
}: Signal4LiveFeedProps) {
  const lastSync = analytics?.syncedAt
    ? new Date(analytics.syncedAt).toLocaleString()
    : null;

  return (
    <Card
      title="Signal4 live analytics"
      subtitle="Real-time statewide crash data from signal4analytics.com"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Radio className="h-3 w-3" />
          Live feed
        </span>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Crash map points and statewide totals are pulled directly from the public{" "}
          <a
            href="https://signal4analytics.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 underline"
          >
            Signal4 Analytics
          </a>{" "}
          dashboard — no CSV upload required. Data refreshes every 5 minutes.
        </p>

        {loading && !analytics ? (
          <p className="text-sm text-slate-500">Connecting to Signal4…</p>
        ) : analytics ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={`${analytics.year} crashes`} value={analytics.totals.crashes.toLocaleString()} />
            <Stat label="Fatalities" value={analytics.totals.fatalities.toLocaleString()} />
            <Stat
              label="Serious injuries"
              value={analytics.totals.seriousInjuries.toLocaleString()}
            />
            <Stat label="Map points" value={analytics.mapPoints.toLocaleString()} />
          </div>
        ) : null}

        {lastSync && (
          <p className="text-xs text-slate-500">Last synced: {lastSync}</p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && analytics && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Navigation and heatmaps use live Signal4 serious-injury &amp; fatal crash points.
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading || syncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Refresh now"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
