"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "saferoute_install_dismissed";

function isMobileUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIosUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    if (isStandaloneMode()) return true;
    if (!isMobileUa()) return true;
    return Boolean(localStorage.getItem(DISMISS_KEY));
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  const isIos = isIosUa();
  const visible = !dismissed && !isStandaloneMode() && isMobileUa();

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg">
      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">Install SafeRoute on your phone</p>
            <p className="mt-1 text-sm text-slate-300">
              Add to your home screen for full-screen GPS navigation — test before uploading CSV data.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {isIos ? (
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Share className="h-4 w-4 shrink-0 text-emerald-400" />
              Tap <strong className="text-white">Share</strong> in Safari
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-4 w-4 shrink-0 text-emerald-400" />
              Choose <strong className="text-white">Add to Home Screen</strong>
            </li>
          </ol>
        ) : deferredPrompt ? (
          <button
            type="button"
            onClick={() => void installAndroid()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Install app
          </button>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Open browser menu → <strong className="text-slate-200">Install app</strong> or{" "}
            <strong className="text-slate-200">Add to Home screen</strong>
          </p>
        )}
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
