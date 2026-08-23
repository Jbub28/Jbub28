import { useSupabaseBackend } from "./auth";
import { getSupabaseClient } from "./client";
import type { Signal4StateReport } from "@/lib/types/signal4-report";

const STORAGE_KEY = "prrp_signal4_report";

export async function saveStateReport(report: Signal4StateReport): Promise<void> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { error } = await supabase.from("signal4_state_reports").upsert({
      id: report.id,
      user_id: report.user_id,
      report_title: report.report_title,
      data_through: report.data_through,
      last_updated: report.last_updated,
      report_data: report,
      imported_at: report.imported_at,
    });
    if (error) throw error;
    return;
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  }
}

export async function fetchStateReport(userId: string): Promise<Signal4StateReport | null> {
  if (await useSupabaseBackend()) {
    const supabase = getSupabaseClient()!;
    const { data, error } = await supabase
      .from("signal4_state_reports")
      .select("report_data")
      .eq("user_id", userId)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data?.report_data as Signal4StateReport) ?? null;
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as Signal4StateReport;
    return report.user_id === userId ? report : report;
  } catch {
    return null;
  }
}

export async function ensureStateReport(userId: string): Promise<Signal4StateReport> {
  const existing = await fetchStateReport(userId);
  if (existing) return existing;

  const { getAttachedFloridaReport } = await import("@/lib/parsers/signal4-report");
  const report = getAttachedFloridaReport(userId);
  await saveStateReport(report);
  return report;
}
