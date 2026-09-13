"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return (
    <p
      className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold ${
        online ? "bg-white/15 text-white" : "bg-[var(--warn-bg)] text-[var(--warn)]"
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? "Online" : "Offline"}
    </p>
  );
}
