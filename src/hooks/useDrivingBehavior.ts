"use client";

import { useCallback, useState } from "react";
import type { GeolocationSample } from "@/hooks/useGeolocation";
import type { GpsSample } from "@/lib/driving/behavior";

interface UseDrivingBehaviorOptions {
  enabled: boolean;
}

export function useDrivingBehavior({ enabled }: UseDrivingBehaviorOptions) {
  const [samples, setSamples] = useState<GpsSample[]>([]);

  const onGpsSample = useCallback(
    (sample: GeolocationSample) => {
      if (!enabled) return;
      const gpsSample: GpsSample = {
        position: sample.position,
        timestamp: sample.timestamp,
        speedMph: sample.speedMph,
        heading: sample.heading,
        accuracyMeters: sample.accuracyMeters,
      };
      setSamples((prev) => [...prev, gpsSample].slice(-12));
    },
    [enabled]
  );

  const resetSamples = useCallback(() => setSamples([]), []);

  return { samples, onGpsSample, resetSamples };
}
