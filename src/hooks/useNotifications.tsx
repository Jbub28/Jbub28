"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type NotificationType = "weather" | "hazard" | "reroute" | "connectivity" | "info";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  urgency?: "low" | "medium" | "high";
  actionLabel?: string;
  onAction?: () => void;
  createdAt: string;
  read?: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  push: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => string;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback((n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: AppNotification = {
      ...n,
      id,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 20));
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <NotificationContext.Provider value={{ notifications, push, dismiss, markRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
