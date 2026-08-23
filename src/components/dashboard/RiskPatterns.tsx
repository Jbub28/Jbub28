"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { PatternInsight } from "@/lib/types/crash";
import { Card } from "@/components/ui/Card";

interface RiskPatternsProps {
  insights: PatternInsight[];
}

function barColor(risk: number): string {
  if (risk >= 30) return "#dc2626";
  if (risk >= 15) return "#d97706";
  return "#059669";
}

export function RiskPatterns({ insights }: RiskPatternsProps) {
  const chartData = insights.slice(0, 6).map((i) => ({
    name: i.label.length > 18 ? i.label.slice(0, 16) + "…" : i.label,
    risk: i.riskContribution,
    fullLabel: i.label,
    detail: i.value,
  }));

  return (
    <Card
      title="Historic crash patterns"
      subtitle="From Signal4 data — severity, time, weather, and contributing factors"
    >
      {insights.length === 0 ? (
        <p className="text-sm text-slate-500">Import Signal4 crash data to analyze patterns.</p>
      ) : (
        <div className="space-y-4">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white p-2 text-xs shadow dark:bg-slate-800">
                        <p className="font-medium">{d.fullLabel}</p>
                        <p className="text-slate-500">{d.detail}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="risk" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={barColor(entry.risk)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {insights.slice(0, 6).map((insight, i) => (
              <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{insight.category}</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{insight.label}</p>
                <p className="text-xs text-slate-500">{insight.value}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
