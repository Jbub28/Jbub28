import type { AddressSuggestion } from "@/lib/mapbox/client";

const STORAGE_KEY = "prrp_trip_history";
const MAX_TRIPS = 200;

export interface TripRecord {
  id: string;
  label: string;
  shortName: string;
  lat: number;
  lng: number;
  category?: string;
  timestamp: number;
  dayOfWeek: number;
  hour: number;
}

function readTrips(): TripRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TripRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrips(trips: TripRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips.slice(0, MAX_TRIPS)));
}

/** Record a trip when the user starts navigation or builds a route. */
export function recordTrip(
  destination: AddressSuggestion | { label: string; shortName?: string; lat: number; lng: number; category?: string }
): void {
  const now = new Date();
  const shortName =
    "shortName" in destination && destination.shortName
      ? destination.shortName
      : destination.label.split(",")[0].trim();

  const record: TripRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: destination.label,
    shortName,
    lat: destination.lat,
    lng: destination.lng,
    category: destination.category,
    timestamp: now.getTime(),
    dayOfWeek: now.getDay(),
    hour: now.getHours(),
  };

  const trips = readTrips();
  trips.unshift(record);
  writeTrips(trips);
}

export function getTripHistory(): TripRecord[] {
  return readTrips();
}

export function clearTripHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Seed demo history so first-time users see how smart chips work. */
export function seedDemoHistoryIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (readTrips().length > 0) return;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const demoTrips: Omit<TripRecord, "id">[] = [
    {
      label: "Subway, 123 Main St, Tampa, FL",
      shortName: "Subway",
      lat: 27.9506,
      lng: -82.4572,
      category: "restaurant, fast food",
      timestamp: now.getTime() - 7 * 24 * 60 * 60 * 1000,
      dayOfWeek: day,
      hour: hour >= 11 && hour <= 14 ? hour : 12,
    },
    {
      label: "Subway, 123 Main St, Tampa, FL",
      shortName: "Subway",
      lat: 27.9506,
      lng: -82.4572,
      category: "restaurant, fast food",
      timestamp: now.getTime() - 14 * 24 * 60 * 60 * 1000,
      dayOfWeek: day,
      hour: 12,
    },
    {
      label: "Subway, 123 Main St, Tampa, FL",
      shortName: "Subway",
      lat: 27.9506,
      lng: -82.4572,
      category: "restaurant, fast food",
      timestamp: now.getTime() - 21 * 24 * 60 * 60 * 1000,
      dayOfWeek: day,
      hour: 12,
    },
    {
      label: "Publix, 456 Oak Ave, Tampa, FL",
      shortName: "Publix",
      lat: 27.962,
      lng: -82.44,
      category: "grocery, supermarket",
      timestamp: now.getTime() - 2 * 24 * 60 * 60 * 1000,
      dayOfWeek: (day + 6) % 7,
      hour: 17,
    },
    {
      label: "Starbucks, 789 Palm Dr, Tampa, FL",
      shortName: "Starbucks",
      lat: 27.948,
      lng: -82.465,
      category: "coffee, cafe",
      timestamp: now.getTime() - 1 * 24 * 60 * 60 * 1000,
      dayOfWeek: day,
      hour: 8,
    },
  ];

  writeTrips(
    demoTrips.map((trip) => ({
      ...trip,
      id: `${trip.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    }))
  );
}

/** Destinations within ~150 m are treated as the same place. */
export function destinationKey(trip: Pick<TripRecord, "lat" | "lng" | "shortName">): string {
  const latKey = trip.lat.toFixed(3);
  const lngKey = trip.lng.toFixed(3);
  const nameKey = trip.shortName.toLowerCase().replace(/\s+/g, " ").trim();
  return `${nameKey}|${latKey}|${lngKey}`;
}
