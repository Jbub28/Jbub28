import { v4 as uuidv4 } from "uuid";
import { ensureAuthSession, useSupabaseBackend } from "./auth";
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import type {
  AreaRiskScore,
  CrashEvent,
  DataSource,
  HighRiskCorridor,
  ImportSource,
  RoutePrediction,
} from "@/lib/types/crash";

const STORAGE_KEYS = {
  crashes: "prrp_crashes",
  corridors: "prrp_corridors",
  scores: "prrp_area_scores",
  predictions: "prrp_predictions",
  userId: "prrp_user_id",
} as const;

function getLocalUserId(): string {
  if (typeof window === "undefined") return "demo-user";
  let id = localStorage.getItem(STORAGE_KEYS.userId);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(STORAGE_KEYS.userId, id);
  }
  return id;
}

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function getStorageMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export async function getUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const authUserId = await ensureAuthSession();
    if (authUserId) return authUserId;

    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  }
  return getLocalUserId();
}

export async function fetchCrashes(
  dataSource: DataSource = "signal4"
): Promise<CrashEvent[]> {
  const userId = await getUserId();

  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("crash_events")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("crash_datetime", { ascending: false });

    if (error) throw error;
    return (data ?? []) as CrashEvent[];
  }

  return readLocal<CrashEvent>(STORAGE_KEYS.crashes)
    .filter((c) => c.user_id === userId && c.data_source === dataSource)
    .sort(
      (a, b) =>
        new Date(b.crash_datetime).getTime() - new Date(a.crash_datetime).getTime()
    );
}

export async function saveCrashes(crashes: CrashEvent[]): Promise<void> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { error } = await supabase.from("crash_events").upsert(crashes);
    if (error) throw error;
    return;
  }

  const existing = readLocal<CrashEvent>(STORAGE_KEYS.crashes);
  const map = new Map(existing.map((c) => [c.id, c]));
  crashes.forEach((c) => map.set(c.id, c));
  writeLocal(STORAGE_KEYS.crashes, Array.from(map.values()));
}

export async function fetchCorridors(
  dataSource: DataSource = "signal4"
): Promise<HighRiskCorridor[]> {
  const userId = await getUserId();

  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("high_risk_corridors")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("crash_count", { ascending: false });

    if (error) throw error;
    return (data ?? []) as HighRiskCorridor[];
  }

  return readLocal<HighRiskCorridor>(STORAGE_KEYS.corridors)
    .filter((r) => r.user_id === userId && r.data_source === dataSource)
    .sort((a, b) => b.crash_count - a.crash_count);
}

export async function saveCorridors(corridors: HighRiskCorridor[]): Promise<void> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { error } = await supabase.from("high_risk_corridors").upsert(corridors);
    if (error) throw error;
    return;
  }

  const existing = readLocal<HighRiskCorridor>(STORAGE_KEYS.corridors);
  const map = new Map(existing.map((r) => [r.id, r]));
  corridors.forEach((r) => map.set(r.id, r));
  writeLocal(STORAGE_KEYS.corridors, Array.from(map.values()));
}

export async function saveAreaRiskScore(score: AreaRiskScore): Promise<void> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { error } = await supabase.from("area_risk_scores").insert(score);
    if (error) throw error;
    return;
  }

  const existing = readLocal<AreaRiskScore>(STORAGE_KEYS.scores);
  existing.unshift(score);
  writeLocal(STORAGE_KEYS.scores, existing.slice(0, 50));
}

export async function fetchLatestAreaRiskScore(
  dataSource: DataSource = "signal4"
): Promise<AreaRiskScore | null> {
  const userId = await getUserId();

  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("area_risk_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as AreaRiskScore | null;
  }

  const scores = readLocal<AreaRiskScore>(STORAGE_KEYS.scores).filter(
    (s) => s.user_id === userId && s.data_source === dataSource
  );
  return scores[0] ?? null;
}

export async function saveRoutePrediction(
  prediction: RoutePrediction
): Promise<void> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { error } = await supabase.from("route_predictions").insert(prediction);
    if (error) throw error;
    return;
  }

  const existing = readLocal<RoutePrediction>(STORAGE_KEYS.predictions);
  existing.unshift(prediction);
  writeLocal(STORAGE_KEYS.predictions, existing.slice(0, 20));
}

export async function fetchRoutePredictions(): Promise<RoutePrediction[]> {
  const userId = await getUserId();

  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("route_predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return (data ?? []) as RoutePrediction[];
  }

  return readLocal<RoutePrediction>(STORAGE_KEYS.predictions)
    .filter((p) => p.user_id === userId)
    .slice(0, 10);
}

export async function logImport(
  source: ImportSource,
  recordsImported: number,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  const userId = await getUserId();

  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    await supabase.from("import_logs").insert({
      user_id: userId,
      import_source: source,
      status,
      records_imported: recordsImported,
      error_message: errorMessage,
    });
  }
}
