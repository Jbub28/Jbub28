"use client";

import { formatDistance } from "@/lib/geo";
import type { RerouteRecommendation } from "@/lib/types/hazard";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Route, X } from "lucide-react";

interface RerouteAlertProps {
  recommendation: RerouteRecommendation;
  rerouting?: boolean;
  onReroute: () => void;
  onDismiss: () => void;
}

const URGENCY_STYLES = {
  low: "border-amber-500/50 bg-amber-950/90",
  medium: "border-orange-500/60 bg-orange-950/90",
  high: "border-red-500/70 bg-red-950/90",
};

export function RerouteAlert({
  recommendation,
  rerouting,
  onReroute,
  onDismiss,
}: RerouteAlertProps) {
  return (
    <div
      className={`rounded-2xl border p-4 text-white shadow-xl backdrop-blur ${URGENCY_STYLES[recommendation.urgency]}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
            Safer route suggested
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{recommendation.summary}</p>
          <p className="mt-1 text-xs text-slate-300">{recommendation.reason}</p>
          {recommendation.distanceAheadMeters > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              Nearest concern: {formatDistance(recommendation.distanceAheadMeters)} ahead
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-full p-1 hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" className="flex-1" disabled={rerouting} onClick={onReroute}>
          <Route className="h-4 w-4" />
          {rerouting ? "Rerouting…" : "Reroute now"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="bg-slate-800 text-white hover:bg-slate-700"
          onClick={onDismiss}
        >
          Keep route
        </Button>
      </div>
    </div>
  );
}
