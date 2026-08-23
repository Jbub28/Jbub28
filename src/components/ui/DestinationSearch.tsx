"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Building2, Loader2, MapPin, Store } from "lucide-react";
import {
  isMapboxConfigured,
  searchDestinationSuggestions,
  type AddressSuggestion,
  type MapboxCoord,
} from "@/lib/mapbox/client";

interface DestinationSearchProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  proximity?: MapboxCoord;
}

function SuggestionIcon({ kind, category }: { kind?: string; category?: string }) {
  if (kind === "poi" || category) return <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  if (kind === "place" || kind === "locality") {
    return <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />;
  }
  return <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />;
}

export function DestinationSearch({
  label = "Destination",
  value,
  onChange,
  onSelect,
  placeholder = "Search business, place, or address…",
  required,
  proximity,
}: DestinationSearchProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!isMapboxConfigured() || query.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setLoading(true);
      try {
        const results = await searchDestinationSuggestions(query, proximity);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [proximity]
  );

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(value), 280);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pickSuggestion(suggestion: AddressSuggestion) {
    onChange(suggestion.label);
    onSelect?.(suggestion);
    setSuggestions([]);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const inputId = "destination-search";

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-emerald-950/50 text-emerald-100"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <SuggestionIcon kind={s.kind} category={s.category} />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">
                    {s.shortName ?? s.label.split(",")[0]}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-500">{s.label}</p>
                  {s.category && (
                    <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">
                      {s.category.replace(/,/g, " · ")}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
