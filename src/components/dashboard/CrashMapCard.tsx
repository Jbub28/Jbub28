"use client";

import dynamic from "next/dynamic";
import type { CrashEvent } from "@/lib/types/crash";
import { Card } from "@/components/ui/Card";

const CrashMapInner = dynamic(() => import("./CrashMap").then((m) => m.CrashMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
      Loading map…
    </div>
  ),
});

interface CrashMapCardProps {
  crashes: CrashEvent[];
  highlightCenter?: { lat: number; lng: number };
}

export function CrashMapCard({ crashes, highlightCenter }: CrashMapCardProps) {
  return (
    <Card
      title="Historic crash map"
      subtitle={`${crashes.length} Signal4 crash records plotted`}
    >
      {crashes.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-600">
          Import Signal4 crash data to see historic crashes on the map
        </div>
      ) : (
        <CrashMapInner crashes={crashes} highlightCenter={highlightCenter} />
      )}
    </Card>
  );
}
