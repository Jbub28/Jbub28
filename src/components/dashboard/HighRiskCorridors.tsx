"use client";

import type { HighRiskCorridor } from "@/lib/types/crash";
import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

interface HighRiskCorridorsProps {
  corridors: HighRiskCorridor[];
  onSelect?: (corridor: HighRiskCorridor) => void;
  selectedId?: string;
}

export function HighRiskCorridors({ corridors, onSelect, selectedId }: HighRiskCorridorsProps) {
  return (
    <Card title="High-risk corridors" subtitle="Locations with the most historic crashes">
      {corridors.length === 0 ? (
        <p className="text-sm text-slate-500">
          Import Signal4 data to identify high-risk corridors.
        </p>
      ) : (
        <ul className="space-y-2">
          {corridors.slice(0, 8).map((corridor) => (
            <li key={corridor.id}>
              <button
                type="button"
                onClick={() => onSelect?.(corridor)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedId === corridor.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {corridor.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {corridor.crash_count} crashes
                    {corridor.total_fatalities > 0 && ` · ${corridor.total_fatalities} fatalities`}
                    {corridor.total_injuries > 0 && ` · ${corridor.total_injuries} injuries`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    corridor.avg_severity_score < 40
                      ? "bg-emerald-100 text-emerald-700"
                      : corridor.avg_severity_score < 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {Math.round(corridor.avg_severity_score)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
