"use client";

import {
  AlertTriangle,
  CloudRain,
  Navigation,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";

const TYPE_ICONS = {
  weather: CloudRain,
  hazard: AlertTriangle,
  reroute: Navigation,
  connectivity: WifiOff,
  info: Wifi,
};

const URGENCY_STYLES = {
  low: "border-slate-600 bg-slate-900/95",
  medium: "border-amber-500/50 bg-amber-950/90",
  high: "border-red-500/60 bg-red-950/90",
};

interface NotificationStackProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationStack({ notifications, onDismiss }: NotificationStackProps) {
  const unread = notifications.filter((n) => !n.read).slice(0, 4);
  if (unread.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-16 z-30 space-y-2 px-4">
      {unread.map((n) => {
        const Icon = TYPE_ICONS[n.type];
        const style = URGENCY_STYLES[n.urgency ?? "low"];
        return (
          <div
            key={n.id}
            className={`pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-xl border p-3 shadow-xl backdrop-blur ${style}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{n.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{n.message}</p>
              {n.actionLabel && n.onAction && (
                <button
                  type="button"
                  onClick={n.onAction}
                  className="mt-2 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {n.actionLabel}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(n.id)}
              className="shrink-0 rounded p-1 hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
