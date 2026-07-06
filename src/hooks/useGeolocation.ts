"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

export interface GeolocationState {
  position: LatLng | null;
  heading: number | null;
  accuracyMeters: number | null;
  error: string | null;
  watching: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    heading: null,
    accuracyMeters: null,
    error: null,
    watching: false,
  });
  const watchId = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, watching: false }));
  }, []);

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation is not supported in this browser." }));
      return;
    }

    stopWatching();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          heading: pos.coords.heading,
          accuracyMeters: pos.coords.accuracy,
          error: null,
          watching: true,
        });
      },
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
  }, [stopWatching]);

  const getCurrentPosition = useCallback((): Promise<LatLng> => {
    return new Promise((resolve, reject) => {
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
    });
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return { ...state, startWatching, stopWatching, getCurrentPosition };
}
