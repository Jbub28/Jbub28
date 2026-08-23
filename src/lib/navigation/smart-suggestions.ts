import { destinationKey, getTripHistory, type TripRecord } from "./trip-history";

export type TimeWindow = "breakfast" | "lunch" | "dinner" | "morning" | "afternoon" | "evening" | "late";

export interface SmartDestination {
  id: string;
  label: string;
  shortName: string;
  lat: number;
  lng: number;
  category?: string;
  icon: string;
  reason: string;
  score: number;
  visitCount: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const TIME_WINDOWS: Record<TimeWindow, { label: string; hours: number[] }> = {
  breakfast: { label: "breakfast", hours: [6, 7, 8, 9, 10] },
  lunch: { label: "lunch", hours: [11, 12, 13, 14] },
  dinner: { label: "dinner", hours: [17, 18, 19, 20, 21] },
  morning: { label: "morning", hours: [6, 7, 8, 9, 10, 11] },
  afternoon: { label: "afternoon", hours: [12, 13, 14, 15, 16, 17] },
  evening: { label: "evening", hours: [18, 19, 20, 21, 22] },
  late: { label: "late night", hours: [22, 23, 0, 1, 2, 3, 4, 5] },
};

function getTimeWindow(hour: number): TimeWindow {
  if (hour >= 6 && hour <= 10) return "breakfast";
  if (hour >= 11 && hour <= 14) return "lunch";
  if (hour >= 17 && hour <= 21) return "dinner";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 22) return "evening";
  return "late";
}

function inferIcon(name: string, category?: string): string {
  const text = `${name} ${category ?? ""}`.toLowerCase();

  if (/subway|mcdonald|burger|taco|pizza|restaurant|food|dining|chipotle|wendy|kfc|chick-fil|domino|panda/.test(text)) {
    return "🍔";
  }
  if (/starbucks|coffee|dunkin|espresso|cafe|café/.test(text)) return "☕";
  if (/publix|walmart|target|grocery|market|aldi|costco|trader|whole foods|kroger|safeway/.test(text)) {
    return "🛒";
  }
  if (/shell|chevron|exxon|bp |gas|fuel|wawa|circle k|speedway|marathon/.test(text)) return "⛽";
  if (/cvs|walgreens|pharmacy|drug/.test(text)) return "💊";
  if (/hospital|clinic|medical|urgent|doctor|health/.test(text)) return "🏥";
  if (/gym|fitness|planet fitness|ymca/.test(text)) return "💪";
  if (/home|work|office/.test(text)) return "🏠";
  if (/school|university|college|campus/.test(text)) return "🎓";
  if (/airport|terminal/.test(text)) return "✈️";
  if (/park|beach|trail/.test(text)) return "🌳";

  if (category) {
    if (/restaurant|food|dining|fast food/.test(category)) return "🍔";
    if (/coffee|cafe/.test(category)) return "☕";
    if (/grocery|supermarket/.test(category)) return "🛒";
    if (/gas|fuel/.test(category)) return "⛽";
    if (/pharmacy/.test(category)) return "💊";
    if (/hospital|medical/.test(category)) return "🏥";
  }

  return "📍";
}

function buildReason(
  visitCount: number,
  matchesDay: boolean,
  matchesWindow: boolean,
  dayOfWeek: number,
  window: TimeWindow
): string {
  const dayLabel = DAY_NAMES[dayOfWeek];
  const windowLabel = TIME_WINDOWS[window].label;

  if (matchesDay && matchesWindow && visitCount >= 2) {
    return `Usually ${windowLabel} · ${dayLabel}`;
  }
  if (matchesWindow && visitCount >= 2) {
    return `Often at ${windowLabel}`;
  }
  if (matchesDay && visitCount >= 2) {
    return `Often on ${dayLabel}s`;
  }
  if (visitCount >= 3) {
    return `Visited ${visitCount} times`;
  }
  return "Recent destination";
}

interface AggregatedDestination {
  key: string;
  label: string;
  shortName: string;
  lat: number;
  lng: number;
  category?: string;
  visitCount: number;
  dayMatches: number;
  windowMatches: number;
  lastVisited: number;
}

function aggregateTrips(trips: TripRecord[]): AggregatedDestination[] {
  const map = new Map<string, AggregatedDestination>();

  for (const trip of trips) {
    const key = destinationKey(trip);
    const existing = map.get(key);
    if (existing) {
      existing.visitCount += 1;
      existing.lastVisited = Math.max(existing.lastVisited, trip.timestamp);
      if (trip.category && !existing.category) existing.category = trip.category;
    } else {
      map.set(key, {
        key,
        label: trip.label,
        shortName: trip.shortName,
        lat: trip.lat,
        lng: trip.lng,
        category: trip.category,
        visitCount: 1,
        dayMatches: 0,
        windowMatches: 0,
        lastVisited: trip.timestamp,
      });
    }
  }

  return Array.from(map.values());
}

function scoreDestination(
  dest: AggregatedDestination,
  trips: TripRecord[],
  now: Date,
  currentWindow: TimeWindow
): { score: number; dayMatches: number; windowMatches: number } {
  const currentDay = now.getDay();
  const windowHours = new Set(TIME_WINDOWS[currentWindow].hours);

  let dayMatches = 0;
  let windowMatches = 0;

  for (const trip of trips) {
    if (destinationKey(trip) !== dest.key) continue;
    if (trip.dayOfWeek === currentDay) dayMatches += 1;
    if (windowHours.has(trip.hour)) windowMatches += 1;
  }

  const recencyDays = (now.getTime() - dest.lastVisited) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 14 - recencyDays) * 0.5;

  const score =
    dest.visitCount * 2 +
    dayMatches * 3 +
    windowMatches * 4 +
    recencyBoost;

  return { score, dayMatches, windowMatches };
}

/** Compute personalized destination chips from local trip history. */
export function getSmartDestinations(now = new Date(), limit = 6): SmartDestination[] {
  const trips = getTripHistory();
  if (trips.length === 0) return [];

  const currentWindow = getTimeWindow(now.getHours());
  const aggregated = aggregateTrips(trips);

  const scored = aggregated
    .map((dest) => {
      const { score, dayMatches, windowMatches } = scoreDestination(dest, trips, now, currentWindow);
      const matchesDay = dayMatches >= 1;
      const matchesWindow = windowMatches >= 1;

      return {
        id: dest.key,
        label: dest.label,
        shortName: dest.shortName,
        lat: dest.lat,
        lng: dest.lng,
        category: dest.category,
        icon: inferIcon(dest.shortName, dest.category),
        reason: buildReason(dest.visitCount, matchesDay, matchesWindow, now.getDay(), currentWindow),
        score,
        visitCount: dest.visitCount,
      } satisfies SmartDestination;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
