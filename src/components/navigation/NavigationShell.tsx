"use client";

import { useSignal4LiveFeed } from "@/hooks/useSignal4LiveFeed";
import { ensureStateReport } from "@/lib/supabase/state-report";
import { getUserId } from "@/lib/supabase/storage";
import type { Signal4StateReport } from "@/lib/types/signal4-report";
import { NotificationProvider } from "@/hooks/useNotifications";
import { NavigationApp } from "./NavigationApp";
import { Loader2, Radio } from "lucide-react";
import { useEffect, useState } from "react";

export function NavigationShell() {
  const {
    crashes,
    corridors,
    loading: liveLoading,
    syncing,
    error: liveError,
    refresh,
  } = useSignal4LiveFeed({ enabled: true });

  const [stateReport, setStateReport] = useState<Signal4StateReport | null>(null);
  const [userId, setUserId] = useState("");
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await getUserId();
        if (cancelled) return;
        setUserId(uid);
        const report = await ensureStateReport(uid);
        if (cancelled) return;
        setStateReport(report);
      } catch (err) {
        console.error("Failed to load state report", err);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = liveLoading || reportLoading;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="flex items-center gap-2 text-sm">
          <Radio className="h-4 w-4 text-emerald-500" />
          Loading live Signal4 crash analytics…
        </p>
      </div>
    );
  }

  return (
    <NotificationProvider>
      {liveError && (
        <div className="bg-amber-950/90 px-4 py-2 text-center text-xs text-amber-200">
          Signal4 sync issue: {liveError}. Using cached data if available.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      )}
      {syncing && !liveError && (
        <div className="bg-emerald-950/80 px-4 py-1.5 text-center text-xs text-emerald-300">
          Updating crash data from Signal4…
        </div>
      )}
      <NavigationApp
        userId={userId}
        crashes={crashes}
        corridors={corridors}
        stateReport={stateReport}
      />
    </NotificationProvider>
  );
}
