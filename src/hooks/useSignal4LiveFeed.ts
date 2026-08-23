"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrashEvent, HighRiskCorridor } from "@/lib/types/crash";
import type { Signal4LiveAnalytics } from "@/lib/signal4/types";
import { loadSignal4LiveFeed, readLiveCache } from "@/lib/signal4/live-sync";
import { getUserId } from "@/lib/supabase/storage";

const DEFAULT_POLL_MS = 5 * 60 * 1000;

interface UseSignal4LiveFeedOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface UseSignal4LiveFeedResult {
  crashes: CrashEvent[];
  corridors: HighRiskCorridor[];
  analytics: Signal4LiveAnalytics | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
}

export function useSignal4LiveFeed(
  options: UseSignal4LiveFeedOptions = {}
): UseSignal4LiveFeedResult {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_MS } = options;
  const cached = readLiveCache();

  const [crashes, setCrashes] = useState<CrashEvent[]>(cached?.analytics.crashes ?? []);
  const [corridors, setCorridors] = useState<HighRiskCorridor[]>(cached?.corridors ?? []);
  const [analytics, setAnalytics] = useState<Signal4LiveAnalytics | null>(
    cached?.analytics ?? null
  );
  const [loading, setLoading] = useState(enabled && !cached);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string>("");

  const refresh = useCallback(async (isInitial = false) => {
    if (!enabled) return;
    if (isInitial) setLoading(true);
    else setSyncing(true);
    setError(null);

    try {
      const userId = userIdRef.current || (await getUserId());
      userIdRef.current = userId;
      const result = await loadSignal4LiveFeed(userId, { refresh: true });
      setCrashes(result.analytics.crashes);
      setCorridors(result.corridors);
      setAnalytics(result.analytics);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sync Signal4 live feed";
      setError(msg);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    void refresh(true);
    const id = window.setInterval(() => void refresh(false), pollIntervalMs);
    return () => window.clearInterval(id);
  }, [enabled, pollIntervalMs, refresh]);

  return {
    crashes,
    corridors,
    analytics,
    loading,
    syncing,
    error,
    lastSyncedAt: analytics?.syncedAt ?? null,
    refresh: () => refresh(false),
  };
}
