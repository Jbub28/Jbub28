"use client";

import { formatDistance, formatDuration } from "@/lib/geo";
import { cleanInstruction, maneuverIcon } from "@/lib/mapbox/navigation";
import type { RouteStep } from "@/lib/mapbox/client";
import { Navigation2 } from "lucide-react";

interface TurnBannerProps {
  step: RouteStep;
  distanceToStepMeters: number;
  distanceRemainingMeters: number;
  durationRemainingSeconds: number;
  arrived?: boolean;
  destinationLabel?: string;
}

export function TurnBanner({
  step,
  distanceToStepMeters,
  distanceRemainingMeters,
  durationRemainingSeconds,
  arrived,
  destinationLabel,
}: TurnBannerProps) {
  if (arrived) {
    return (
      <div className="rounded-2xl bg-emerald-600 px-4 py-4 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-3xl">◎</span>
          <div>
            <p className="text-lg font-semibold">You have arrived</p>
            {destinationLabel && <p className="text-sm text-emerald-100">{destinationLabel}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/95 px-4 py-4 text-white shadow-xl backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-3xl leading-none">{maneuverIcon(step.maneuver)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            In {formatDistance(distanceToStepMeters)}
          </p>
          <p className="mt-1 text-lg font-semibold leading-snug">{cleanInstruction(step)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t border-slate-700 pt-3 text-sm text-slate-300">
        <span className="flex items-center gap-1.5">
          <Navigation2 className="h-4 w-4" />
          {formatDistance(distanceRemainingMeters)} left
        </span>
        <span>{formatDuration(durationRemainingSeconds)}</span>
      </div>
    </div>
  );
}
