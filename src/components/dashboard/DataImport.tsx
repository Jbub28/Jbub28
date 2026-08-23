"use client";

import { useCallback, useRef, useState } from "react";
import type { CrashEvent } from "@/lib/types/crash";
import { parseSignal4Csv } from "@/lib/parsers/signal4-analytics";
import { identifyHighRiskCorridors } from "@/lib/risk/corridors";
import { calculateAreaRiskScore } from "@/lib/risk/scoring";
import {
  getUserId,
  logImport,
  saveAreaRiskScore,
  saveCorridors,
  saveCrashes,
  getStorageMode,
} from "@/lib/supabase/storage";
import { saveStateReport } from "@/lib/supabase/state-report";
import { seedSignal4SampleData } from "@/lib/seed-signal4";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
  ExternalLink,
} from "lucide-react";

interface DataImportProps {
  onImportComplete: () => void;
}

export function DataImport({ onImportComplete }: DataImportProps) {
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const processCrashes = useCallback(
    async (newCrashes: CrashEvent[]) => {
      if (newCrashes.length === 0) {
        setStatus({ type: "error", message: "No crash records found in the uploaded file." });
        return;
      }

      const userId = await getUserId();
      const { fetchCrashes } = await import("@/lib/supabase/storage");
      const existing = await fetchCrashes();
      const merged = [...existing, ...newCrashes];
      const unique = Array.from(
        new Map(merged.map((c) => [c.report_number, c])).values()
      );

      await saveCrashes(newCrashes);
      const corridors = identifyHighRiskCorridors(unique, userId);
      await saveCorridors(corridors);
      const score = calculateAreaRiskScore(unique, userId);
      await saveAreaRiskScore(score);
      await logImport("signal4_analytics", newCrashes.length, "success");

      setStatus({
        type: "success",
        message: `Imported ${newCrashes.length} crash records from Signal4. Area risk index: ${score.safety_index}/100.`,
      });
      onImportComplete();
    },
    [onImportComplete]
  );

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const { parseSignal4ReportPdf } = await import("@/lib/parsers/signal4-report-pdf");
      const report = await parseSignal4ReportPdf(file, userId);

      await saveStateReport(report);
      setStatus({
        type: "success",
        message: `Imported Florida Traffic Safety Report (data through ${report.data_through}). Route predictions now use statewide patterns.`,
      });
      onImportComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF report";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const text = await file.text();
      const crashes = parseSignal4Csv(text, userId);
      await processCrashes(crashes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse Signal4 CSV";
      setStatus({ type: "error", message: msg });
      await logImport("signal4_analytics", 0, "error", msg);
    } finally {
      setLoading(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  }

  async function loadSampleData() {
    setLoading(true);
    setStatus(null);
    try {
      const { crashCount, safetyIndex } = await seedSignal4SampleData();
      setStatus({
        type: "success",
        message: `Loaded ${crashCount} sample Tampa-area crashes from Signal4-style data. Risk index: ${safetyIndex}/100.`,
      });
      onImportComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load sample data";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const storageMode = getStorageMode();

  return (
    <Card
      title="Import Signal4 Analytics crash data"
      subtitle="Upload crash exports from Event Analysis at signal4analytics.com"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Database className="h-3 w-3" />
          {storageMode === "supabase" ? "Supabase" : "Local storage"}
        </span>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Import from{" "}
          <a href="https://signal4analytics.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-600 underline">
            Signal4 Analytics
            <ExternalLink className="h-3 w-3" />
          </a>
          : upload the <strong>Florida Traffic Safety Report (PDF)</strong> for statewide patterns,
          or <strong>Crash Tables (CSV)</strong> from Event Analysis for location-specific data.
        </p>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50/50 px-4 py-3 text-sm transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40">
          <FileText className="h-5 w-5 text-emerald-600" />
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-200">Upload Florida Traffic Safety Report (PDF)</span>
            <p className="text-xs text-slate-500">Statewide crash trends, day-of-week patterns, emphasis areas</p>
          </div>
          <input ref={pdfRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handlePdfUpload} disabled={loading} />
        </label>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-6 transition-colors hover:border-emerald-400 dark:border-slate-600">
          <FileSpreadsheet className="h-8 w-8 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Drop Signal4 Crash Tables CSV or click to browse</span>
          <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} disabled={loading} />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button type="button" variant="ghost" size="sm" onClick={loadSampleData} disabled={loading}>
            <Upload className="h-4 w-4" />
            Load sample Tampa crash data
          </Button>
          {storageMode === "local" && (
            <p className="text-xs text-slate-500">
              Set Supabase env vars in <code>.env.local</code> to persist data.
            </p>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : status.type === "error"
                ? "bg-red-50 text-red-800"
                : "bg-blue-50 text-blue-800"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {status.message}
        </div>
      )}
    </Card>
  );
}
