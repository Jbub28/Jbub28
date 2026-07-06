"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { CrashEvent, HighRiskCorridor, RoutePrediction } from "@/lib/types/crash";
import type { Signal4StateReport } from "@/lib/types/signal4-report";
import { predictRouteRisk } from "@/lib/risk/prediction";
import {
  fetchNavigationRoute,
  geocodeAddress,
  isMapboxConfigured,
  type MapboxCoord,
  type NavigationRoute,
} from "@/lib/mapbox/client";
import {
  computeNavigationProgress,
  isOffRoute,
  cleanInstruction,
} from "@/lib/mapbox/navigation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { TurnBanner } from "./TurnBanner";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Shield,
  X,
} from "lucide-react";
import type { AddressSuggestion } from "@/lib/mapbox/client";

const NavigationMap = dynamic(
  () => import("./NavigationMap").then((m) => m.NavigationMap),
  { ssr: false, loading: () => <div className="h-full bg-slate-900" /> }
);

type NavPhase = "search" | "preview" | "navigating";

interface NavigationAppProps {
  userId: string;
  crashes: CrashEvent[];
  corridors: HighRiskCorridor[];
  stateReport?: Signal4StateReport | null;
}

const RISK_STYLES = {
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  high: "bg-red-500/20 text-red-300 border-red-500/40",
};

export function NavigationApp({
  userId,
  crashes,
  corridors,
  stateReport,
}: NavigationAppProps) {
  const [phase, setPhase] = useState<NavPhase>("search");
  const [destination, setDestination] = useState("");
  const [destCoord, setDestCoord] = useState<AddressSuggestion | null>(null);
  const [originLabel, setOriginLabel] = useState("My location");
  const [originCoord, setOriginCoord] = useState<MapboxCoord | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [prediction, setPrediction] = useState<RoutePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSpokenStep = useRef(-1);
  const reroutingRef = useRef(false);

  const geo = useGeolocation();

  const progress = useMemo(() => {
    if (phase !== "navigating" || !route || !geo.position) return null;
    return computeNavigationProgress(route, geo.position);
  }, [phase, route, geo.position]);

  const resolveOrigin = useCallback(async (): Promise<MapboxCoord> => {
    if (originCoord) return originCoord;
    const pos = geo.position ?? (await geo.getCurrentPosition());
    return { lat: pos.lat, lng: pos.lng, label: "My location" };
  }, [originCoord, geo]);

  const buildRoute = useCallback(async () => {
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const origin = await resolveOrigin();
      let dest: MapboxCoord | null = destCoord
        ? { lat: destCoord.lat, lng: destCoord.lng, label: destCoord.label }
        : null;

      if (!dest) {
        dest = await geocodeAddress(destination.trim(), origin);
      }
      if (!dest) throw new Error("Could not find that destination.");

      const navRoute = await fetchNavigationRoute(origin, dest);
      if (!navRoute) throw new Error("No driving route found.");

      const risk = predictRouteRisk({
        userId,
        originAddress: origin.label ?? "My location",
        destinationAddress: dest.label ?? destination.trim(),
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: dest.lat,
        destLng: dest.lng,
        plannedDate: new Date().toISOString().slice(0, 10),
        plannedTime: new Date().toTimeString().slice(0, 5),
        crashes,
        corridors,
        stateReport,
      });

      setOriginCoord(origin);
      setRoute(navRoute);
      setPrediction(risk);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plan route");
    } finally {
      setLoading(false);
    }
  }, [destination, destCoord, resolveOrigin, userId, crashes, corridors, stateReport]);

  const startNavigation = useCallback(() => {
    if (!route) return;
    setPhase("navigating");
    lastSpokenStep.current = -1;
    geo.startWatching();
  }, [route, geo]);

  const stopNavigation = useCallback(() => {
    geo.stopWatching();
    setPhase("search");
    setRoute(null);
    setPrediction(null);
    setDestination("");
    setDestCoord(null);
    lastSpokenStep.current = -1;
  }, [geo]);

  const reroute = useCallback(async () => {
    if (!route || !geo.position || reroutingRef.current) return;
    reroutingRef.current = true;
    try {
      const origin: MapboxCoord = {
        lat: geo.position.lat,
        lng: geo.position.lng,
        label: "Current location",
      };
      const navRoute = await fetchNavigationRoute(origin, route.destination);
      if (navRoute) {
        setRoute(navRoute);
        setOriginCoord(origin);
      }
    } finally {
      reroutingRef.current = false;
    }
  }, [route, geo.position]);

  useEffect(() => {
    if (phase !== "navigating" || !route || !progress || !geo.position) return;

    if (isOffRoute(progress)) {
      void reroute();
    }

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      progress.stepIndex !== lastSpokenStep.current &&
      route.steps[progress.stepIndex]
    ) {
      lastSpokenStep.current = progress.stepIndex;
      const utterance = new SpeechSynthesisUtterance(
        cleanInstruction(route.steps[progress.stepIndex])
      );
      utterance.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [phase, route, progress, geo.position, reroute]);

  const currentStep = route?.steps[progress?.stepIndex ?? 0];

  if (!isMapboxConfigured()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-slate-300">
        <MapPin className="h-10 w-10 text-emerald-500" />
        <p className="text-lg font-medium">Mapbox token required</p>
        <p className="max-w-sm text-sm">
          Add <code className="text-emerald-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable GPS navigation.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-slate-950 text-white">
      {/* Top bar */}
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {phase !== "search" && (
            <button
              type="button"
              onClick={() => (phase === "navigating" ? setPhase("preview") : stopNavigation())}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/90 shadow-lg backdrop-blur"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur">
            <Navigation className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold">SafeRoute Nav</span>
          </div>
        </div>
        <Link
          href="/insights"
          className="flex h-10 items-center gap-1.5 rounded-full bg-slate-900/90 px-3 text-sm shadow-lg backdrop-blur hover:bg-slate-800"
        >
          <BarChart3 className="h-4 w-4" />
          Insights
        </Link>
      </header>

      {/* Map layer */}
      {(phase === "preview" || phase === "navigating") && route && (
        <div className="absolute inset-0">
          <NavigationMap
            route={route}
            userPosition={geo.position ?? originCoord}
            userHeading={geo.heading}
            routeProgressIndex={progress?.routeIndex ?? 0}
            followUser={phase === "navigating"}
            crashes={crashes}
            showCrashOverlay={phase === "navigating"}
          />
        </div>
      )}

      {/* Search panel */}
      {phase === "search" && (
        <div className="flex flex-1 flex-col justify-end p-4 pt-20">
          <div className="mx-auto w-full max-w-lg space-y-4 rounded-2xl bg-slate-900/95 p-5 shadow-2xl backdrop-blur">
            <div>
              <h1 className="text-xl font-bold">Where to?</h1>
              <p className="mt-1 text-sm text-slate-400">
                GPS navigation with Signal4 crash-risk awareness
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300">
              <LocateFixed className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="truncate">{originLabel}</span>
            </div>

            <AddressAutocomplete
              label="Destination"
              placeholder="Search address or place…"
              value={destination}
              onChange={(v) => {
                setDestination(v);
                setDestCoord(null);
              }}
              onSelect={setDestCoord}
              proximity={geo.position ? { lat: geo.position.lat, lng: geo.position.lng } : undefined}
              required
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="button"
              className="w-full"
              disabled={loading || !destination.trim()}
              onClick={buildRoute}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Get directions
            </Button>

            <button
              type="button"
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
              onClick={async () => {
                try {
                  const pos = await geo.getCurrentPosition();
                  setOriginCoord({ lat: pos.lat, lng: pos.lng, label: "My location" });
                  setOriginLabel("My location (GPS locked)");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "GPS unavailable");
                }
              }}
            >
              Refresh my location
            </button>
          </div>
        </div>
      )}

      {/* Route preview */}
      {phase === "preview" && route && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
          <div className="mx-auto w-full max-w-lg space-y-3 rounded-2xl bg-slate-900/95 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {route.destination.label ?? destination}
                </p>
                <p className="text-sm text-slate-400">
                  {route.distanceMiles?.toFixed(1)} mi · ~{route.durationMinutes} min
                </p>
              </div>
              <button
                type="button"
                onClick={stopNavigation}
                className="shrink-0 rounded-full p-1 hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {prediction && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${RISK_STYLES[prediction.risk_level]}`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="capitalize">{prediction.risk_level} crash risk</span>
                <span className="text-slate-400">· {prediction.risk_score}/100</span>
              </div>
            )}

            <Button type="button" className="w-full" onClick={startNavigation}>
              <Navigation className="h-4 w-4" />
              Start navigation
            </Button>
          </div>
        </div>
      )}

      {/* Live navigation HUD */}
      {phase === "navigating" && route && currentStep && progress && (
        <div className="absolute bottom-0 left-0 right-0 z-10 space-y-3 p-4">
          {geo.error && (
            <p className="rounded-xl bg-red-500/90 px-4 py-2 text-center text-sm text-white">
              {geo.error}
            </p>
          )}
          <div className="mx-auto w-full max-w-lg">
            <TurnBanner
              step={currentStep}
              distanceToStepMeters={progress.distanceToStepMeters}
              distanceRemainingMeters={progress.distanceRemainingMeters}
              durationRemainingSeconds={progress.durationRemainingSeconds}
              arrived={progress.arrived}
              destinationLabel={route.destination.label ?? destination}
            />
          </div>
          <div className="mx-auto flex w-full max-w-lg gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 bg-slate-800 text-white hover:bg-slate-700"
              onClick={stopNavigation}
            >
              End route
            </Button>
            {progress.arrived && (
              <Button type="button" className="flex-1" onClick={stopNavigation}>
                Done
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Empty map background for search */}
      {phase === "search" && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-800 to-slate-950" />
      )}
    </div>
  );
}
