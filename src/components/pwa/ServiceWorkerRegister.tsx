"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/platform";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (isNativeApp()) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — PWA still works via manifest on iOS
    });
  }, []);

  return null;
}
