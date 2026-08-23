"use client";

import { AlertTriangle, Gauge } from "lucide-react";
import type { DrivingBehaviorAssessment } from "@/lib/driving/behavior";

interface DrivingAlertProps {
  assessment: DrivingBehaviorAssessment;
}

const RISK_STYLES = {
  caution: "border-amber-500/50 bg-amber-950/90 text-amber-100",
  hazardous: "border-orange-500/60 bg-orange-950/90 text-orange-100",
  critical: "border-red-500/70 bg-red-950/90 text-red-100",
};

export function DrivingAlert({ assessment }: DrivingAlertProps) {
  if (assessment.riskLevel === "normal") return null;

  const style =
    assessment.riskLevel === "critical"
      ? RISK_STYLES.critical
      : assessment.riskLevel === "hazardous"
        ? RISK_STYLES.hazardous
        : RISK_STYLES.caution;

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${style}`}>
      <div className="flex items-start gap-3">
        {assessment.riskLevel === "critical" ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Gauge className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Driving behavior alert — {assessment.currentSpeedMph} mph
          </p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{assessment.recommendation}</p>
          {assessment.issues[0] && (
            <p className="mt-1 text-xs opacity-75">{assessment.issues[0].message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
