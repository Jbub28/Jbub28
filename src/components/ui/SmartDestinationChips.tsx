"use client";

import type { SmartDestination } from "@/lib/navigation/smart-suggestions";

interface SmartDestinationChipsProps {
  destinations: SmartDestination[];
  onSelect: (destination: SmartDestination) => void;
  activeId?: string | null;
}

export function SmartDestinationChips({
  destinations,
  onSelect,
  activeId,
}: SmartDestinationChipsProps) {
  if (destinations.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        For you
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {destinations.map((dest) => (
          <button
            key={dest.id}
            type="button"
            onClick={() => onSelect(dest)}
            className={`flex min-w-[7.5rem] shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${
              activeId === dest.id
                ? "border-emerald-500 bg-emerald-950/60"
                : "border-slate-600 bg-slate-800/60 hover:border-emerald-600"
            }`}
          >
            <span className="text-lg leading-none">{dest.icon}</span>
            <span className="mt-1 truncate text-sm font-medium text-slate-100">
              {dest.shortName}
            </span>
            <span className="mt-0.5 truncate text-[10px] text-slate-500">{dest.reason}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
