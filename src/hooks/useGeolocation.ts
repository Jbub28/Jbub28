"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

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
        const speedMph =
          pos.coords.speed != null && pos.coords.speed >= 0
            ? pos.coords.speed * 2.23694
            : null;
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState({
          position,
          heading: pos.coords.heading,
          speedMph,
          accuracyMeters: pos.coords.accuracy,
          error: null,
          watching: true,
        });
        onSampleRef.current?.({
          position,
          heading: pos.coords.heading,
          speedMph,
          accuracyMeters: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
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
