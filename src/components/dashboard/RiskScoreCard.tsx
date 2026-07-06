"use client";

import type { AreaRiskScore } from "@/lib/types/crash";
import { Card } from "@/components/ui/Card";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskScoreCardProps {
  score: AreaRiskScore | null;
}

function scoreColor(safetyIndex: number): string {
  if (safetyIndex >= 70) return "text-emerald-600";
  if (safetyIndex >= 45) return "text-amber-600";
  return "text-red-600";
}

function scoreRingColor(safetyIndex: number): string {
  if (safetyIndex >= 70) return "stroke-emerald-500";
  if (safetyIndex >= 45) return "stroke-amber-500";
  return "stroke-red-500";
}

export function RiskScoreCard({ score }: RiskScoreCardProps) {
  const safetyIndex = score?.safety_index ?? 50;
  const riskScore = score?.score ?? 50;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (safetyIndex / 100) * circumference;

  return (
    <Card
      title="Historic corridor safety index"
      subtitle={`Based on ${score?.crash_count ?? 0} Signal4 crashes · Risk index ${riskScore}/100`}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              className={scoreRingColor(safetyIndex)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute text-center">
            <span className={`text-3xl font-bold ${scoreColor(safetyIndex)}`}>{safetyIndex}</span>
            <span className="block text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            {safetyIndex >= 70 ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : safetyIndex >= 45 ? (
              <Shield className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {safetyIndex >= 70
                ? "Lower historic crash risk"
                : safetyIndex >= 45
                  ? "Moderate historic crash risk"
                  : "Elevated historic crash risk"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {score?.factors.overallExplanation ??
              "Import Signal4 Analytics crash data to calculate a historic corridor safety index."}
          </p>
        </div>
      </div>
    </Card>
  );
}
