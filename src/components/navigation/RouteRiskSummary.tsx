"use client";

import type { RouteRiskZone } from "@/lib/risk/route-heatmap";
import type { RoutePrediction } from "@/lib/types/crash";
import { Flame, Shield } from "lucide-react";

interface RouteRiskSummaryProps {
  prediction: RoutePrediction | null;
  riskZones: RouteRiskZone[];
  activeIncidentCount: number;
  highRiskZoneCount: number;
}

const ZONE_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  elevated: "text-amber-400",
};

export function RouteRiskSummary({
  prediction,
  riskZones,
  activeIncidentCount,
  highRiskZoneCount,
}: RouteRiskSummaryProps) {
  return (
    <div className="space-y-3">
      {prediction && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm">
          <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="capitalize text-slate-200">{prediction.risk_level} crash risk</span>
          <span className="text-slate-500">· {prediction.risk_score}/100</span>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-red-400" />
          {highRiskZoneCount} high-risk zone{highRiskZoneCount !== 1 ? "s" : ""}
        </span>
        {activeIncidentCount > 0 && (
          <span className="text-amber-400">
            {activeIncidentCount} active incident{activeIncidentCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {riskZones.length > 0 && (
        <ul className="max-h-28 space-y-1.5 overflow-y-auto text-xs">
          {riskZones.map((zone) => (
            <li
              key={zone.id}
              className={`flex items-center gap-2 rounded-lg bg-slate-800/50 px-2.5 py-1.5 ${ZONE_COLORS[zone.severityLabel] ?? "text-slate-300"}`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-80" />
              <span className="truncate text-slate-300">{zone.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-6 rounded bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600" />
          Low → High risk heatmap
        </span>
      </div>
    </div>
  );
}
