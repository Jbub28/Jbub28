"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Building2, Loader2, MapPin, Navigation, Store } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import {
  createSearchSession,
  NEARBY_CATEGORIES,
  resolvePlaceSelection,
  searchNearbyCategory,
  suggestNearbyPlaces,
  type PlaceCategory,
} from "@/lib/mapbox/search-box";
import {
  isMapboxConfigured,
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
  placeholder = "Search store, business, or address…",
  required,
  proximity,
}: DestinationSearchProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<string>(createSearchSession());
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mode, setMode] = useState<"search" | "category">("search");
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | null>(null);

  const resetSession = useCallback(() => {
    sessionRef.current = createSearchSession();
  }, []);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!isMapboxConfigured() || query.trim().length < 2) {
        setSuggestions([]);
        setOpen(false);
        setMode("search");
        return;
      }

      setLoading(true);
      setMode("search");
      setActiveCategory(null);
      try {
        const { suggestions: results } = await suggestNearbyPlaces(
          query,
          proximity,
          sessionRef.current,
          8
        );
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

  const fetchCategory = useCallback(
    async (category: PlaceCategory) => {
      if (!isMapboxConfigured()) return;
      setLoading(true);
      setMode("category");
      setActiveCategory(category);
      resetSession();
      try {
        const results = await searchNearbyCategory(category, proximity, 8);
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
        onChange(NEARBY_CATEGORIES.find((c) => c.id === category)?.label ?? category);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [proximity, onChange, resetSession]
  );

  useEffect(() => {
    if (mode === "category") return;
    const timer = setTimeout(() => fetchSuggestions(value), 280);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions, mode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function pickSuggestion(suggestion: AddressSuggestion) {
    setResolving(true);
    try {
      const resolved = await resolvePlaceSelection(suggestion, sessionRef.current);
      onChange(resolved.label);
      onSelect?.(resolved);
      setSuggestions([]);
      setOpen(false);
      resetSession();
    } catch {
      onChange(suggestion.label);
      if (suggestion.lat && suggestion.lng) onSelect?.(suggestion);
    } finally {
      setResolving(false);
      setMode("search");
      setActiveCategory(null);
    }
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
      void pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const inputId = "destination-search";
  const showCategories = !value.trim() || value.trim().length < 2;

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      <label htmlFor={inputId} className="block">
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </label>

      {/* Quick category chips — like GPS "Gas nearby", "Food nearby" */}
      {showCategories && (
        <div className="flex flex-wrap gap-1.5">
          {NEARBY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => void fetchCategory(cat.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                activeCategory === cat.id
                  ? "border-emerald-500 bg-emerald-950/60 text-emerald-200"
                  : "border-slate-600 bg-slate-800/60 text-slate-300 hover:border-emerald-600 hover:text-emerald-300"
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            setMode("search");
            setActiveCategory(null);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
            if (!value.trim()) resetSession();
          }}
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
          {loading || resolving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Store className="h-4 w-4" />
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full">
          <p className="mb-1 flex items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Navigation className="h-3 w-3" />
            {mode === "category" && activeCategory
              ? `Nearby ${NEARBY_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "places"}`
              : proximity
                ? "Nearby results"
                : "Results"}
          </p>
          <ul
            id={listId}
            role="listbox"
            className="max-h-72 overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
          >
            {suggestions.map((s, i) => (
              <li key={`${s.mapboxId ?? s.label}-${i}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  disabled={resolving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void pickSuggestion(s)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    i === activeIndex
                      ? "bg-emerald-950/50 text-emerald-100"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <SuggestionIcon kind={s.kind} category={s.category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">
                        {s.shortName ?? s.label.split(",")[0]}
                      </p>
                      {s.distanceMeters != null && s.distanceMeters > 0 && (
                        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          {formatDistance(s.distanceMeters)}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {s.address ?? s.label}
                    </p>
                    {s.category && (
                      <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">
                        {s.category.replace(/,/g, " · ").slice(0, 48)}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
