"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/platform";

/** Boot native plugins when running inside the iOS/Android shell. */
export function CapacitorInit() {
  useEffect(() => {
    if (!isNativeApp()) return;

    void (async () => {
      try {
        const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
        ]);

        await StatusBar.setStyle({ style: Style.Dark });
        await SplashScreen.hide();

        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          }
        });
      } catch {
        // Plugins unavailable outside native runtime
      }
    })();
  }, []);

  return null;
}
