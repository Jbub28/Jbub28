"use client";

import type { RiskScore } from "@/lib/types/driving";
import { Card } from "@/components/ui/Card";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskScoreCardProps {
  score: RiskScore | null;
}

function scoreColor(safetyScore: number): string {
  if (safetyScore >= 75) return "text-emerald-600";
  if (safetyScore >= 55) return "text-amber-600";
  return "text-red-600";
}

function scoreRingColor(safetyScore: number): string {
  if (safetyScore >= 75) return "stroke-emerald-500";
  if (safetyScore >= 55) return "stroke-amber-500";
  return "stroke-red-500";
}

function ScoreIcon({ safetyScore }: { safetyScore: number }) {
  if (safetyScore >= 75) return <CheckCircle className="h-5 w-5 text-emerald-600" />;
  if (safetyScore >= 55) return <Shield className="h-5 w-5 text-amber-600" />;
  return <AlertTriangle className="h-5 w-5 text-red-600" />;
}

export function RiskScoreCard({ score }: RiskScoreCardProps) {
  const safetyScore = score?.safety_score ?? 50;
  const riskScore = score?.score ?? 50;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (safetyScore / 100) * circumference;

  return (
    <Card
      title="Personal driving safety score"
      subtitle={`Based on ${score?.trip_count ?? 0} trips · Risk index ${riskScore}/100`}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-700"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className={scoreRingColor(safetyScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute text-center">
            <span className={`text-3xl font-bold ${scoreColor(safetyScore)}`}>
              {safetyScore}
            </span>
            <span className="block text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <ScoreIcon safetyScore={safetyScore} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {safetyScore >= 75
                ? "Good safety profile"
                : safetyScore >= 55
                  ? "Moderate risk — room to improve"
                  : "Elevated risk — review patterns below"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {score?.factors.overallExplanation ??
              "Import your driving history to generate a personalized safety score."}
          </p>
          {score && score.calculated_at && (
            <p className="text-xs text-slate-400">
              Last calculated {new Date(score.calculated_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
