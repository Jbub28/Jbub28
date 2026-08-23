import type { SupportedStorage } from "@supabase/supabase-js";

const memoryStore = new Map<string, string>();

/**
 * Web/Capacitor equivalent of React Native AsyncStorage for Supabase auth.
 * Uses localStorage in the browser; in-memory fallback during SSR.
 */
export function getAuthStorage(): SupportedStorage {
  if (typeof window === "undefined") {
    return {
      getItem: (key) => memoryStore.get(key) ?? null,
      setItem: (key, value) => {
        memoryStore.set(key, value);
      },
      removeItem: (key) => {
        memoryStore.delete(key);
      },
    };
  }

  return window.localStorage;
}
