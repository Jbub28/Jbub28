"use client";

import { useEffect, useState } from "react";
import { seedDemoHistoryIfEmpty } from "@/lib/navigation/trip-history";
import {
  getSmartDestinations,
  type SmartDestination,
} from "@/lib/navigation/smart-suggestions";

/** Recompute personalized destination chips on an interval and when history may change. */
export function useSmartDestinations(enabled = true): SmartDestination[] {
  const [destinations, setDestinations] = useState<SmartDestination[]>([]);

  useEffect(() => {
    if (!enabled) {
      setDestinations([]);
      return;
    }

    seedDemoHistoryIfEmpty();

    function refresh() {
      setDestinations(getSmartDestinations());
    }

    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [enabled]);

  return destinations;
}
