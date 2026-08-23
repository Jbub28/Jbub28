"use client";

import type { Signal4StateReport } from "@/lib/types/signal4-report";
import { getStatewideSummaryInsight } from "@/lib/risk/statewide";
import { Card } from "@/components/ui/Card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface StateReportCardProps {
  report: Signal4StateReport | null;
}

export function StateReportCard({ report }: StateReportCardProps) {
  if (!report) return null;

  const year2025 = report.crashes_by_day.find((d) => d.year === 2025);
  const chartData = year2025
    ? [
        { day: "Mon", crashes: year2025.mon },
        { day: "Tue", crashes: year2025.tue },
        { day: "Wed", crashes: year2025.wed },
        { day: "Thu", crashes: year2025.thu },
        { day: "Fri", crashes: year2025.fri },
        { day: "Sat", crashes: year2025.sat },
        { day: "Sun", crashes: year2025.sun },
      ]
    : [];

  const latest = report.yearly_summary.find((y) => y.year === 2025);

  return (
    <Card
      title="Florida Traffic Safety Report"
      subtitle={`Signal4 Analytics · data through ${report.data_through}`}
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {getStatewideSummaryInsight(report)}
      </p>

      {latest && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(latest.totalCrashes / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-slate-500">Total crashes (2025)</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-950/30">
            <p className="text-2xl font-bold text-red-700">{latest.fatalities.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Fatalities (2025)</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/30">
            <p className="text-2xl font-bold text-amber-700">{latest.seriousInjuries.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Serious injuries (2025)</p>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="h-48">
          <p className="mb-2 text-xs font-medium text-slate-500">2025 crashes by day of week</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              <Bar dataKey="crashes" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.day === "Fri" || entry.day === "Sat" ? "#dc2626" : entry.day === "Sun" ? "#059669" : "#d97706"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Top emphasis areas (2025 fatalities)</p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {report.emphasis_areas
            .filter((a) => (a.fatalities[2025] ?? 0) > 0)
            .sort((a, b) => (b.fatalities[2025] ?? 0) - (a.fatalities[2025] ?? 0))
            .slice(0, 6)
            .map((area) => (
              <li key={area.name} className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-800 dark:text-slate-200">{area.name}</span>
                {" — "}{area.fatalities[2025]} fatalities
              </li>
            ))}
        </ul>
      </div>
    </Card>
  );
}
