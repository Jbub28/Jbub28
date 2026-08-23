"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";
import { isNativeApp } from "@/lib/native/platform";

export interface GeolocationState {
  position: LatLng | null;
  heading: number | null;
  speedMph: number | null;
  accuracyMeters: number | null;
  error: string | null;
  watching: boolean;
}

export interface GeolocationSample {
  position: LatLng;
  heading: number | null;
  speedMph: number | null;
  accuracyMeters: number | null;
  timestamp: number;
}

interface UseGeolocationOptions {
  onSample?: (sample: GeolocationSample) => void;
}

function mapBrowserPosition(
  pos: GeolocationPosition,
  onSample?: (sample: GeolocationSample) => void
): GeolocationState {
  const speedMph =
    pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 2.23694 : null;
  const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  onSample?.({
    position,
    heading: pos.coords.heading,
    speedMph,
    accuracyMeters: pos.coords.accuracy,
    timestamp: pos.timestamp || Date.now(),
  });
  return {
    position,
    heading: pos.coords.heading,
    speedMph,
    accuracyMeters: pos.coords.accuracy,
    error: null,
    watching: true,
  };
}

function mapCapacitorPosition(
  pos: {
    coords: {
      latitude: number;
      longitude: number;
      heading: number | null | undefined;
      speed: number | null | undefined;
      accuracy: number;
    };
    timestamp: number;
  },
  onSample?: (sample: GeolocationSample) => void
): GeolocationState {
  const speedMph =
    pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 2.23694 : null;
  const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  const heading = pos.coords.heading ?? null;
  onSample?.({
    position,
    heading,
    speedMph,
    accuracyMeters: pos.coords.accuracy,
    timestamp: pos.timestamp || Date.now(),
  });
  return {
    position,
    heading,
    speedMph,
    accuracyMeters: pos.coords.accuracy,
    error: null,
    watching: true,
  };
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const onSampleRef = useRef(options.onSample);

  useEffect(() => {
    onSampleRef.current = options.onSample;
  }, [options.onSample]);

  const [state, setState] = useState<GeolocationState>({
    position: null,
    heading: null,
    speedMph: null,
    accuracyMeters: null,
    error: null,
    watching: false,
  });
  const watchId = useRef<number | string | null>(null);

  const stopWatching = useCallback(() => {
    void (async () => {
      if (watchId.current === null) return;

      if (typeof watchId.current === "string" && isNativeApp()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        await Geolocation.clearWatch({ id: watchId.current });
      } else if (typeof watchId.current === "number" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      watchId.current = null;
      setState((s) => ({ ...s, watching: false }));
    })();
  }, []);

  const startWatching = useCallback(() => {
    void (async () => {
      stopWatching();

      if (isNativeApp()) {
        try {
          const { Geolocation } = await import("@capacitor/geolocation");
          const perm = await Geolocation.requestPermissions();
          if (perm.location === "denied") {
            setState((s) => ({
              ...s,
              error: "Location permission denied. Enable GPS in Settings to navigate.",
              watching: false,
            }));
            return;
          }

          watchId.current = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 15000 },
            (pos, err) => {
              if (err || !pos) {
                setState((s) => ({
                  ...s,
                  error: "Could not get your location.",
                  watching: false,
                }));
                return;
              }
              setState(mapCapacitorPosition(pos, onSampleRef.current));
            }
          );
          setState((s) => ({ ...s, watching: true, error: null }));
        } catch {
          setState((s) => ({
            ...s,
            error: "Native location services unavailable.",
            watching: false,
          }));
        }
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setState((s) => ({ ...s, error: "Geolocation is not supported in this browser." }));
        return;
      }

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => setState(mapBrowserPosition(pos, onSampleRef.current)),
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Enable GPS to navigate."
              : err.code === err.POSITION_UNAVAILABLE
                ? "Location unavailable."
                : "Timed out getting your location.";
          setState((s) => ({ ...s, error: message, watching: false }));
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
      setState((s) => ({ ...s, watching: true, error: null }));
    })();
  }, [stopWatching]);

  const getCurrentPosition = useCallback((): Promise<LatLng> => {
    return new Promise((resolve, reject) => {
      void (async () => {
        if (isNativeApp()) {
          try {
            const { Geolocation } = await import("@capacitor/geolocation");
            const perm = await Geolocation.requestPermissions();
            if (perm.location === "denied") {
              reject(new Error("Location permission denied."));
              return;
            }
            const pos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 15000,
            });
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          } catch {
            reject(new Error("Could not get your location."));
          }
          return;
        }

        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("Geolocation is not supported."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => {
            const message =
              err.code === err.PERMISSION_DENIED
                ? "Location permission denied."
                : "Could not get your location.";
            reject(new Error(message));
          },
          { enableHighAccuracy: true, timeout: 15000 }
        );
      })();
    });
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return { ...state, startWatching, stopWatching, getCurrentPosition };
}
