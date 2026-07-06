import { v4 as uuidv4 } from "uuid";
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import type {
  CommonRoute,
  DataSource,
  ImportSource,
  RiskScore,
  RoutePrediction,
  Trip,
} from "@/lib/types/driving";

const STORAGE_KEYS = {
  trips: "prrp_trips",
  routes: "prrp_common_routes",
  scores: "prrp_risk_scores",
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
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  }
  return getLocalUserId();
}

export async function fetchTrips(
  dataSource: DataSource = "personal"
): Promise<Trip[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  if (supabase) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("start_time", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(normalizeTrip);
  }

  return readLocal<Trip>(STORAGE_KEYS.trips)
    .filter((t) => t.user_id === userId && t.data_source === dataSource)
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("trips").upsert(trips);
    if (error) throw error;
    return;
  }

  const existing = readLocal<Trip>(STORAGE_KEYS.trips);
  const map = new Map(existing.map((t) => [t.id, t]));
  trips.forEach((t) => map.set(t.id, t));
  writeLocal(STORAGE_KEYS.trips, Array.from(map.values()));
}

export async function fetchCommonRoutes(
  dataSource: DataSource = "personal"
): Promise<CommonRoute[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  if (supabase) {
    const { data, error } = await supabase
      .from("common_routes")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("trip_count", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  return readLocal<CommonRoute>(STORAGE_KEYS.routes)
    .filter((r) => r.user_id === userId && r.data_source === dataSource)
    .sort((a, b) => b.trip_count - a.trip_count);
}

export async function saveCommonRoutes(routes: CommonRoute[]): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("common_routes").upsert(routes);
    if (error) throw error;
    return;
  }

  const existing = readLocal<CommonRoute>(STORAGE_KEYS.routes);
  const map = new Map(existing.map((r) => [r.id, r]));
  routes.forEach((r) => map.set(r.id, r));
  writeLocal(STORAGE_KEYS.routes, Array.from(map.values()));
}

export async function saveRiskScore(score: RiskScore): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("risk_scores").insert(score);
    if (error) throw error;
    return;
  }

  const existing = readLocal<RiskScore>(STORAGE_KEYS.scores);
  existing.unshift(score);
  writeLocal(STORAGE_KEYS.scores, existing.slice(0, 50));
}

export async function fetchLatestRiskScore(
  dataSource: DataSource = "personal"
): Promise<RiskScore | null> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  if (supabase) {
    const { data, error } = await supabase
      .from("risk_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("data_source", dataSource)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  const scores = readLocal<RiskScore>(STORAGE_KEYS.scores).filter(
    (s) => s.user_id === userId && s.data_source === dataSource
  );
  return scores[0] ?? null;
}

export async function saveRoutePrediction(
  prediction: RoutePrediction
): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from("route_predictions").insert(prediction);
    if (error) throw error;
    return;
  }

  const existing = readLocal<RoutePrediction>(STORAGE_KEYS.predictions);
  existing.unshift(prediction);
  writeLocal(STORAGE_KEYS.predictions, existing.slice(0, 20));
}

export async function fetchRoutePredictions(): Promise<RoutePrediction[]> {
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  if (supabase) {
    const { data, error } = await supabase
      .from("route_predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data ?? [];
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
  const supabase = getSupabaseClient();
  const userId = await getUserId();

  if (supabase) {
    await supabase.from("import_logs").insert({
      user_id: userId,
      import_source: source,
      status,
      records_imported: recordsImported,
      error_message: errorMessage,
    });
  }
}

function normalizeTrip(row: Record<string, unknown>): Trip {
  return {
    ...row,
    route_polyline: (row.route_polyline as Trip["route_polyline"]) ?? [],
    harsh_braking_count: (row.harsh_braking_count as number) ?? 0,
    harsh_acceleration_count: (row.harsh_acceleration_count as number) ?? 0,
    phone_use_count: (row.phone_use_count as number) ?? 0,
    speeding_events: (row.speeding_events as number) ?? 0,
  } as Trip;
}
