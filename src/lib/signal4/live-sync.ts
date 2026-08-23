import { identifyHighRiskCorridors } from "@/lib/risk/corridors";
import { calculateAreaRiskScore } from "@/lib/risk/scoring";
import type { CrashEvent, HighRiskCorridor } from "@/lib/types/crash";
import type { Signal4LiveAnalytics } from "./types";
import {
  fetchSignal4Map,
  fetchSignal4Totals,
  getSignal4CurrentYear,
  parseSignal4Totals,
} from "./live-client";
import { mapSignal4EventPoints } from "./live-mapper";
import {
  logImport,
  saveAreaRiskScore,
  saveCorridors,
  saveCrashes,
} from "@/lib/supabase/storage";

const LIVE_CACHE_KEY = "prrp_signal4_live_cache";

export interface Signal4LiveCache {
  analytics: Signal4LiveAnalytics;
  corridors: HighRiskCorridor[];
}

export function readLiveCache(): Signal4LiveCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LIVE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Signal4LiveCache) : null;
  } catch {
    return null;
  }
}

function writeLiveCache(cache: Signal4LiveCache): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(cache));
}

/** Pull live analytics from signal4analytics.com and persist locally / Supabase. */
export async function syncSignal4LiveFeed(userId: string): Promise<Signal4LiveCache> {
  const year = getSignal4CurrentYear();
  const syncedAt = new Date().toISOString();

  const [map, totals] = await Promise.all([
    fetchSignal4Map(year),
    fetchSignal4Totals(year),
  ]);

  const crashes = mapSignal4EventPoints(map.eventPoints ?? [], userId, syncedAt);
  const parsedTotals = parseSignal4Totals(totals);

  if (crashes.length === 0) {
    throw new Error("Signal4 returned no crash map points.");
  }

  await saveCrashes(crashes);
  const corridors = identifyHighRiskCorridors(crashes, userId);
  await saveCorridors(corridors);
  const score = calculateAreaRiskScore(crashes, userId);
  await saveAreaRiskScore(score);
  await logImport("signal4_analytics", crashes.length, "success");

  const analytics: Signal4LiveAnalytics = {
    year,
    syncedAt,
    totals: parsedTotals,
    mapPoints: map.featureCount,
    crashes,
  };

  const cache: Signal4LiveCache = { analytics, corridors };
  writeLiveCache(cache);
  return cache;
}

/** Load live feed from cache, optionally refreshing from Signal4. */
export async function loadSignal4LiveFeed(
  userId: string,
  options: { refresh?: boolean; maxCacheAgeMs?: number } = {}
): Promise<Signal4LiveCache> {
  const { refresh = true, maxCacheAgeMs = 5 * 60 * 1000 } = options;
  const cached = readLiveCache();

  if (
    cached &&
    !refresh &&
    Date.now() - new Date(cached.analytics.syncedAt).getTime() < maxCacheAgeMs
  ) {
    return cached;
  }

  try {
    return await syncSignal4LiveFeed(userId);
  } catch (err) {
    if (cached) {
      console.warn("Signal4 live sync failed, using cached data:", err);
      return cached;
    }
    throw err;
  }
}

export function mergeLiveCrashes(
  stored: CrashEvent[],
  live: CrashEvent[]
): CrashEvent[] {
  const map = new Map<string, CrashEvent>();
  for (const c of stored) map.set(c.report_number, c);
  for (const c of live) map.set(c.report_number, c);
  return Array.from(map.values());
}
