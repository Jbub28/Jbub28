import { v4 as uuidv4 } from "uuid";
import type { AddressSuggestion, MapboxCoord } from "./client";
import { getMapboxToken, isMapboxConfigured } from "./client";

const SEARCH_BOX_BASE = "https://api.mapbox.com/search/searchbox/v1";

interface SearchBoxSuggestion {
  name: string;
  full_address?: string;
  place_formatted?: string;
  mapbox_id: string;
  feature_type?: string;
  poi_category?: string[];
  distance?: number;
  address?: string;
}

interface SuggestResponse {
  suggestions: SearchBoxSuggestion[];
}

interface RetrieveResponse {
  features: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      name?: string;
      full_address?: string;
      place_formatted?: string;
      feature_type?: string;
      poi_category?: string[];
    };
  }>;
}

interface CategoryResponse {
  features: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      name?: string;
      full_address?: string;
      place_formatted?: string;
      mapbox_id?: string;
      poi_category?: string[];
    };
  }>;
}

export type PlaceCategory =
  | "grocery"
  | "coffee"
  | "gas_station"
  | "pharmacy"
  | "hospital"
  | "restaurant";

export const NEARBY_CATEGORIES: Array<{ id: PlaceCategory; label: string; icon: string }> = [
  { id: "grocery", label: "Grocery", icon: "🛒" },
  { id: "coffee", label: "Coffee", icon: "☕" },
  { id: "gas_station", label: "Gas", icon: "⛽" },
  { id: "pharmacy", label: "Pharmacy", icon: "💊" },
  { id: "restaurant", label: "Food", icon: "🍔" },
  { id: "hospital", label: "Hospital", icon: "🏥" },
];

/** Start a Mapbox Search Box billing session (reuse until user picks a result). */
export function createSearchSession(): string {
  return uuidv4();
}

function proximityParam(proximity?: MapboxCoord): string {
  if (!proximity) return "proximity=-82.45,27.95";
  return `proximity=${proximity.lng},${proximity.lat}`;
}

async function searchBoxFetch<T>(path: string): Promise<T> {
  const token = getMapboxToken();
  if (!token) throw new Error("Mapbox token not configured");

  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${SEARCH_BOX_BASE}${path}${sep}access_token=${token}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mapbox Search Box error: ${res.status} ${err}`);
  }
  return res.json() as Promise<T>;
}

function mapSuggestion(s: SearchBoxSuggestion): AddressSuggestion {
  const address = s.full_address ?? s.place_formatted ?? s.address ?? "";
  return {
    label: address ? `${s.name}, ${address}` : s.name,
    shortName: s.name,
    address,
    lng: 0,
    lat: 0,
    kind: s.feature_type === "poi" ? "poi" : "place",
    category: s.poi_category?.join(", "),
    distanceMeters: s.distance,
    mapboxId: s.mapbox_id,
    sessionRequired: true,
  };
}

/** Filter out sub-POIs (e.g. "Western Union - Publix") when searching a brand name. */
function prioritizeBrandMatches(suggestions: AddressSuggestion[], query: string): AddressSuggestion[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return suggestions;

  const brandMatches = suggestions.filter((s) => {
    const name = (s.shortName ?? s.label).toLowerCase();
    if (/western union|atm|coinstar|moneygram/.test(name) && !q.includes("western")) {
      return false;
    }
    return name.startsWith(q) || name.includes(q);
  });

  return brandMatches.length > 0 ? brandMatches : suggestions;
}

/** GPS-style nearby place search — e.g. "Publix" returns multiple locations by distance. */
export async function suggestNearbyPlaces(
  query: string,
  proximity?: MapboxCoord,
  sessionToken?: string,
  limit = 8
): Promise<{ suggestions: AddressSuggestion[]; sessionToken: string }> {
  if (!query.trim() || query.trim().length < 2 || !isMapboxConfigured()) {
    return { suggestions: [], sessionToken: sessionToken ?? createSearchSession() };
  }

  const token = sessionToken ?? createSearchSession();
  const encoded = encodeURIComponent(query.trim());
  const prox = proximityParam(proximity);

  const data = await searchBoxFetch<SuggestResponse>(
    `/suggest?q=${encoded}&${prox}&session_token=${token}&limit=${limit}&language=en&country=US&types=poi,address,place`
  );

  const suggestions = prioritizeBrandMatches(
    (data.suggestions ?? []).map(mapSuggestion),
    query
  )
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, limit);

  return { suggestions, sessionToken: token };
}

/** Resolve a suggestion to coordinates (call when user picks a result). */
export async function retrievePlace(
  mapboxId: string,
  sessionToken: string
): Promise<AddressSuggestion> {
  const data = await searchBoxFetch<RetrieveResponse>(
    `/retrieve/${encodeURIComponent(mapboxId)}?session_token=${sessionToken}`
  );

  const feature = data.features?.[0];
  if (!feature) throw new Error("Could not resolve that place.");

  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties;
  const name = props.name ?? "Destination";
  const address = props.full_address ?? props.place_formatted ?? "";

  return {
    label: address ? `${name}, ${address}` : name,
    shortName: name,
    address,
    lat,
    lng,
    kind: props.feature_type === "poi" ? "poi" : "address",
    category: props.poi_category?.join(", "),
    sessionRequired: false,
  };
}

/** Browse nearby places by category (grocery, gas, coffee, etc.). */
export async function searchNearbyCategory(
  category: PlaceCategory,
  proximity?: MapboxCoord,
  limit = 8
): Promise<AddressSuggestion[]> {
  if (!isMapboxConfigured()) return [];

  const prox = proximityParam(proximity);
  const data = await searchBoxFetch<CategoryResponse>(
    `/category/${category}?${prox}&limit=${limit}&language=en`
  );

  return (data.features ?? []).map((f, i) => {
    const name = f.properties.name ?? "Place";
    const address = f.properties.full_address ?? f.properties.place_formatted ?? "";
    const [lng, lat] = f.geometry.coordinates;
    return {
      label: address ? `${name}, ${address}` : name,
      shortName: name,
      address,
      lat,
      lng,
      kind: "poi" as const,
      category: f.properties.poi_category?.join(", ") ?? category,
      mapboxId: f.properties.mapbox_id,
      sessionRequired: Boolean(f.properties.mapbox_id),
    };
  });
}

/** Resolve suggestion — retrieve if needed, otherwise return as-is. */
export async function resolvePlaceSelection(
  suggestion: AddressSuggestion,
  sessionToken: string
): Promise<AddressSuggestion> {
  if (suggestion.mapboxId && (suggestion.lat === 0 || suggestion.sessionRequired)) {
    return retrievePlace(suggestion.mapboxId, sessionToken);
  }
  return suggestion;
}
