"use client";

import { useEffect, useState } from "react";
import type { CrashEvent, HighRiskCorridor } from "@/lib/types/crash";
import type { Signal4StateReport } from "@/lib/types/signal4-report";
import { fetchCorridors, fetchCrashes, getUserId } from "@/lib/supabase/storage";
import { ensureStateReport } from "@/lib/supabase/state-report";
import { NotificationProvider } from "@/hooks/useNotifications";
import { NavigationApp } from "./NavigationApp";
import { Loader2 } from "lucide-react";

export function NavigationShell() {
  const [crashes, setCrashes] = useState<CrashEvent[]>([]);
  const [corridors, setCorridors] = useState<HighRiskCorridor[]>([]);
  const [stateReport, setStateReport] = useState<Signal4StateReport | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

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

        const [c, r] = await Promise.all([
          fetchCrashes("signal4"),
          fetchCorridors("signal4"),
        ]);
        if (cancelled) return;
        setCrashes(c);
        setCorridors(r);
      } catch (error) {
        console.error("Failed to load navigation data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <NotificationProvider>
      <NavigationApp
        userId={userId}
        crashes={crashes}
        corridors={corridors}
        stateReport={stateReport}
      />
    </NotificationProvider>
  );
}
