"use client";

import { useEffect, useState } from "react";

export type ConnectivityMode = "online" | "degraded" | "offline";

export function useConnectivity() {
  const [mode, setMode] = useState<ConnectivityMode>("online");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function updateOnline() {
      setIsOnline(navigator.onLine);
    }

    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    const ping = async () => {
      if (!navigator.onLine) {
        setMode("offline");
        return;
      }
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=27.95&longitude=-82.45&current=temperature_2m", {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        setMode(res.ok ? "online" : "degraded");
      } catch {
        setMode("degraded");
      }
    };

    ping();
    const timer = setInterval(ping, 30000);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      clearInterval(timer);
    };
  }, [isOnline]);

  return {
    mode,
    isOnline,
    /** GPS works offline; weather/radar use cache in degraded mode */
    gpsAvailable: typeof navigator !== "undefined" && "geolocation" in navigator,
    isSatelliteFallbackReady: false,
  };
}
