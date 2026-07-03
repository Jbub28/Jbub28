"use client";

import { useCallback, useRef, useState } from "react";
import type { GeicoManualEntry, Trip } from "@/lib/types/driving";
import { parseGoogleTakeoutFiles } from "@/lib/parsers/google-takeout";
import {
  parseGeicoCsv,
  parseGeicoManualEntries,
  parseGeicoScreenshotTextToTrips,
} from "@/lib/parsers/geico-driveeasy";
import { identifyCommonRoutes } from "@/lib/risk/routes";
import { calculateRiskScore } from "@/lib/risk/scoring";
import {
  getUserId,
  logImport,
  saveCommonRoutes,
  saveRiskScore,
  saveTrips,
  getStorageMode,
} from "@/lib/supabase/storage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Upload,
  FileJson,
  Car,
  ClipboardPaste,
  CheckCircle,
  AlertCircle,
  Database,
} from "lucide-react";

interface DataImportProps {
  onImportComplete: () => void;
}

type Tab = "google" | "geico" | "manual";

export function DataImport({ onImportComplete }: DataImportProps) {
  const [tab, setTab] = useState<Tab>("google");
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [manualEntry, setManualEntry] = useState<GeicoManualEntry>({
    date: new Date().toISOString().slice(0, 10),
    startTime: "08:00",
  });
  const [screenshotText, setScreenshotText] = useState("");

  const processTrips = useCallback(
    async (newTrips: Trip[], source: "google_takeout" | "geico_driveeasy" | "manual") => {
      if (newTrips.length === 0) {
        setStatus({ type: "error", message: "No trips found in the uploaded data." });
        return;
      }

      const userId = await getUserId();
      const existing = await import("@/lib/supabase/storage").then((m) =>
        m.fetchTrips()
      );
      const merged = [...existing, ...newTrips];
      const unique = Array.from(new Map(merged.map((t) => [t.id, t])).values());

      await saveTrips(newTrips);
      const routes = identifyCommonRoutes(unique, userId);
      await saveCommonRoutes(routes);
      const score = calculateRiskScore(unique, userId);
      await saveRiskScore(score);
      await logImport(source, newTrips.length, "success");

      setStatus({
        type: "success",
        message: `Imported ${newTrips.length} trips. Safety score updated to ${score.safety_score}/100.`,
      });
      onImportComplete();
    },
    [onImportComplete]
  );

  async function handleGoogleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const parsed: { name: string; content: unknown }[] = [];

      for (const file of Array.from(files)) {
        const text = await file.text();
        parsed.push({ name: file.name, content: JSON.parse(text) });
      }

      const trips = parseGoogleTakeoutFiles(parsed, userId);
      await processTrips(trips, "google_takeout");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse Google Takeout file";
      setStatus({ type: "error", message: msg });
      await logImport("google_takeout", 0, "error", msg);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleGeicoCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const text = await file.text();
      const trips = parseGeicoCsv(text, userId);
      await processTrips(trips, "geico_driveeasy");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse GEICO CSV";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const trips = parseGeicoManualEntries([manualEntry], userId);
      await processTrips(trips, "geico_driveeasy");
      setManualEntry({
        date: new Date().toISOString().slice(0, 10),
        startTime: "08:00",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save trip";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleScreenshotPaste() {
    if (!screenshotText.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const userId = await getUserId();
      const trips = parseGeicoScreenshotTextToTrips(screenshotText, userId);
      await processTrips(trips, "geico_driveeasy");
      setScreenshotText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not parse pasted text";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function loadDemoData() {
    setLoading(true);
    setStatus(null);
    try {
      const { generateDemoTrips } = await import("@/lib/demo-data");
      const userId = await getUserId();
      const trips = generateDemoTrips(userId);
      await processTrips(trips, "manual");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load demo data";
      setStatus({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  const storageMode = getStorageMode();

  return (
    <Card
      title="Import driving data"
      subtitle="Google Maps Timeline / Takeout · GEICO DriveEasy export or manual entry"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Database className="h-3 w-3" />
          {storageMode === "supabase" ? "Supabase" : "Local storage (demo)"}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "google" as Tab, label: "Google Takeout", icon: FileJson },
            { id: "geico" as Tab, label: "GEICO DriveEasy", icon: Car },
            { id: "manual" as Tab, label: "Manual entry", icon: ClipboardPaste },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "google" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Export from{" "}
            <a
              href="https://takeout.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 underline"
            >
              Google Takeout
            </a>{" "}
            with Location History enabled. Upload <code className="text-xs">Timeline.json</code>,{" "}
            Semantic Location History JSON, or <code className="text-xs">Records.json</code>.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-6 transition-colors hover:border-emerald-400 dark:border-slate-600">
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              Drop JSON files or click to browse
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              multiple
              className="hidden"
              onChange={handleGoogleUpload}
              disabled={loading}
            />
          </label>
        </div>
      )}

      {tab === "geico" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload a CSV export from DriveEasy, or paste text copied from a screenshot
            (date, distance, max speed, harsh braking, phone use).
          </p>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
            <Upload className="h-4 w-4" />
            Upload DriveEasy CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleGeicoCsvUpload}
              disabled={loading}
            />
          </label>
          <Textarea
            label="Paste from screenshot"
            placeholder={"7/1/2026\n12.4 miles\nMax speed: 68\nHarsh braking: 2\nPhone use: 1"}
            rows={5}
            value={screenshotText}
            onChange={(e) => setScreenshotText(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleScreenshotPaste}
            disabled={loading || !screenshotText.trim()}
          >
            Parse pasted text
          </Button>
        </div>
      )}

      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={manualEntry.date}
            onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
            required
          />
          <Input
            label="Start time"
            type="time"
            value={manualEntry.startTime}
            onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
            required
          />
          <Input
            label="Distance (miles)"
            type="number"
            step="0.1"
            value={manualEntry.distanceMiles ?? ""}
            onChange={(e) =>
              setManualEntry({
                ...manualEntry,
                distanceMiles: parseFloat(e.target.value) || undefined,
              })
            }
          />
          <Input
            label="Max speed (mph)"
            type="number"
            value={manualEntry.maxSpeedMph ?? ""}
            onChange={(e) =>
              setManualEntry({
                ...manualEntry,
                maxSpeedMph: parseInt(e.target.value, 10) || undefined,
              })
            }
          />
          <Input
            label="Harsh braking events"
            type="number"
            min="0"
            value={manualEntry.harshBraking ?? ""}
            onChange={(e) =>
              setManualEntry({
                ...manualEntry,
                harshBraking: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <Input
            label="Phone use (minutes)"
            type="number"
            min="0"
            value={manualEntry.phoneUseMinutes ?? ""}
            onChange={(e) =>
              setManualEntry({
                ...manualEntry,
                phoneUseMinutes: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <Input
            label="Start address"
            className="sm:col-span-2"
            value={manualEntry.startAddress ?? ""}
            onChange={(e) =>
              setManualEntry({ ...manualEntry, startAddress: e.target.value })
            }
          />
          <Input
            label="End address"
            className="sm:col-span-2"
            value={manualEntry.endAddress ?? ""}
            onChange={(e) =>
              setManualEntry({ ...manualEntry, endAddress: e.target.value })
            }
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              Add trip
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="button" variant="ghost" size="sm" onClick={loadDemoData} disabled={loading}>
          Load sample Tampa-area data
        </Button>
        {storageMode === "local" && (
          <p className="text-xs text-slate-500">
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to persist in Supabase.
          </p>
        )}
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
