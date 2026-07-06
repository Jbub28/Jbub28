"use client";

import type { CommonRoute } from "@/lib/types/driving";
import { Card } from "@/components/ui/Card";
import { Route } from "lucide-react";

interface CommonRoutesProps {
  routes: CommonRoute[];
  onSelect?: (route: CommonRoute) => void;
  selectedId?: string;
}

export function CommonRoutes({ routes, onSelect, selectedId }: CommonRoutesProps) {
  return (
    <Card
      title="Common routes"
      subtitle="Routes you drive most often"
    >
      {routes.length === 0 ? (
        <p className="text-sm text-slate-500">
          No common routes identified yet. Import more trips to detect patterns.
        </p>
      ) : (
        <ul className="space-y-2">
          {routes.slice(0, 8).map((route) => (
            <li key={route.id}>
              <button
                type="button"
                onClick={() => onSelect?.(route)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedId === route.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <Route className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {route.name ?? route.route_hash}
                  </p>
                  <p className="text-xs text-slate-500">
                    {route.trip_count} trips
                    {route.total_distance_miles
                      ? ` · ${route.total_distance_miles} mi total`
                      : ""}
                    {route.typical_duration_minutes
                      ? ` · ~${route.typical_duration_minutes} min`
                      : ""}
                  </p>
                </div>
                {route.avg_risk_score != null && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      route.avg_risk_score < 20
                        ? "bg-emerald-100 text-emerald-700"
                        : route.avg_risk_score < 40
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    Risk {Math.round(route.avg_risk_score)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
