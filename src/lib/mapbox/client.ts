export interface MapboxCoord {
  lat: number;
  lng: number;
  label?: string;
}

export interface RouteGeometry {
  coordinates: [number, number][];
  origin: MapboxCoord;
  destination: MapboxCoord;
  distanceMiles?: number;
  durationMinutes?: number;
}

export interface RouteStep {
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  durationSeconds: number;
  location: [number, number];
}

export interface NavigationRoute extends RouteGeometry {
  steps: RouteStep[];
}

export function isMapboxConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
}

export function getMapboxToken(): string | null {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;
}

async function mapboxFetch<T>(path: string): Promise<T> {
  const token = getMapboxToken();
  if (!token) throw new Error("Mapbox token not configured");

  const res = await fetch(`https://api.mapbox.com${path}${path.includes("?") ? "&" : "?"}access_token=${token}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mapbox API error: ${res.status} ${err}`);
  }
  return res.json() as Promise<T>;
}

interface GeocodeFeature {
  center: [number, number];
  place_name: string;
  text?: string;
  place_type?: string[];
  properties?: { category?: string; landmark?: boolean };
}

interface GeocodeResponse {
  features: GeocodeFeature[];
}

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  kind?: "poi" | "address" | "place" | "locality";
  category?: string;
  shortName?: string;
}

function mapFeature(f: GeocodeFeature): AddressSuggestion {
  const kind = f.place_type?.[0] as AddressSuggestion["kind"];
  return {
    label: f.place_name,
    shortName: f.text ?? f.place_name.split(",")[0],
    lng: f.center[0],
    lat: f.center[1],
    kind: kind ?? "address",
    category: f.properties?.category,
  };
}

function dedupeSuggestions(items: AddressSuggestion[]): AddressSuggestion[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = `${s.lat.toFixed(4)},${s.lng.toFixed(4)},${s.shortName?.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchAddressSuggestions(
  query: string,
  proximity?: MapboxCoord,
  limit = 8
): Promise<AddressSuggestion[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  if (!isMapboxConfigured()) return [];

  const encoded = encodeURIComponent(query.trim());
  const prox = proximity
    ? `&proximity=${proximity.lng},${proximity.lat}`
    : "&proximity=-82.45,27.95";

  const data = await mapboxFetch<GeocodeResponse>(
    `/geocoding/v5/mapbox.places/${encoded}.json?country=US&autocomplete=true&types=address,place,poi,locality,neighborhood${prox}&limit=${limit}`
  );

  return dedupeSuggestions(data.features.map(mapFeature));
}

/** Business & POI-first search for destination field. */
export async function searchDestinationSuggestions(
  query: string,
  proximity?: MapboxCoord,
  limit = 10
): Promise<AddressSuggestion[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  if (!isMapboxConfigured()) return [];

  const encoded = encodeURIComponent(query.trim());
  const prox = proximity
    ? `&proximity=${proximity.lng},${proximity.lat}`
    : "&proximity=-82.45,27.95";

  const [poiData, placeData] = await Promise.all([
    mapboxFetch<GeocodeResponse>(
      `/geocoding/v5/mapbox.places/${encoded}.json?country=US&autocomplete=true&types=poi${prox}&limit=${limit}`
    ).catch(() => ({ features: [] } as GeocodeResponse)),
    mapboxFetch<GeocodeResponse>(
      `/geocoding/v5/mapbox.places/${encoded}.json?country=US&autocomplete=true&types=place,address,locality${prox}&limit=${Math.ceil(limit / 2)}`
    ).catch(() => ({ features: [] } as GeocodeResponse)),
  ]);

  const poi = poiData.features.map(mapFeature);
  const places = placeData.features.map(mapFeature);
  return dedupeSuggestions([...poi, ...places]).slice(0, limit);
}

export async function geocodeAddress(
  address: string,
  proximity?: MapboxCoord
): Promise<MapboxCoord | null> {
  const encoded = encodeURIComponent(address);
  const prox = proximity ? `&proximity=${proximity.lng},${proximity.lat}` : "&proximity=-82.45,27.95";

  const poiAttempt = await mapboxFetch<GeocodeResponse>(
    `/geocoding/v5/mapbox.places/${encoded}.json?country=US&types=poi,place,address${prox}&limit=1`
  ).catch(() => null);

  const feature = poiAttempt?.features[0];
  if (feature) {
    return {
      lng: feature.center[0],
      lat: feature.center[1],
      label: feature.place_name,
    };
  }

  const data = await mapboxFetch<GeocodeResponse>(
    `/geocoding/v5/mapbox.places/${encoded}.json?country=US&limit=1${prox}`
  );
  const fallback = data.features[0];
  if (!fallback) return null;
  return {
    lng: fallback.center[0],
    lat: fallback.center[1],
    label: fallback.place_name,
  };
}

interface DirectionsManeuver {
  instruction: string;
  type: string;
  modifier?: string;
  location: [number, number];
}

interface DirectionsStep {
  geometry: { coordinates: [number, number][] };
  maneuver: DirectionsManeuver;
  distance: number;
  duration: number;
}

interface DirectionsLeg {
  steps: DirectionsStep[];
}

interface DirectionsRoute {
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
  legs: DirectionsLeg[];
}

interface DirectionsResponse {
  routes: DirectionsRoute[];
}

function parseRouteSteps(route: DirectionsRoute): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : "";
      steps.push({
        instruction: step.maneuver.instruction,
        maneuver: `${step.maneuver.type}${modifier}`,
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        location: step.maneuver.location,
      });
    }
  }
  return steps;
}

function buildRouteGeometry(
  route: DirectionsRoute,
  origin: MapboxCoord,
  destination: MapboxCoord
): RouteGeometry {
  return {
    coordinates: route.geometry.coordinates,
    origin,
    destination,
    distanceMiles: route.distance / 1609.34,
    durationMinutes: Math.round(route.duration / 60),
  };
}

export async function fetchRoute(
  origin: MapboxCoord,
  destination: MapboxCoord
): Promise<RouteGeometry | null> {
  const path = `/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full`;
  const data = await mapboxFetch<DirectionsResponse>(path);
  const route = data.routes[0];
  if (!route) return null;
  return buildRouteGeometry(route, origin, destination);
}

export async function fetchNavigationRoute(
  origin: MapboxCoord,
  destination: MapboxCoord
): Promise<NavigationRoute | null> {
  const path =
    `/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?geometries=geojson&overview=full&steps=true&banner_instructions=true`;
  const data = await mapboxFetch<DirectionsResponse>(path);
  const route = data.routes[0];
  if (!route) return null;

  return {
    ...buildRouteGeometry(route, origin, destination),
    steps: parseRouteSteps(route),
  };
}

export async function resolveRouteFromAddresses(
  originAddress: string,
  destinationAddress: string
): Promise<{ origin: MapboxCoord; destination: MapboxCoord; route: RouteGeometry | null }> {
  const origin = await geocodeAddress(originAddress);
  if (!origin) throw new Error(`Could not geocode origin: "${originAddress}"`);

  const destination = await geocodeAddress(destinationAddress, origin);
  if (!destination) throw new Error(`Could not geocode destination: "${destinationAddress}"`);

  let route: RouteGeometry | null = null;
  try {
    route = await fetchRoute(origin, destination);
  } catch {
    route = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      origin,
      destination,
    };
  }

  return { origin, destination, route };
}

/** Fallback when Mapbox token is not set */
export function geocodeHint(address: string): MapboxCoord | null {
  const hints: Record<string, MapboxCoord> = {
    "i-275": { lat: 27.965, lng: -82.49, label: "I-275, Tampa" },
    "dale mabry": { lat: 27.94, lng: -82.506, label: "Dale Mabry Hwy" },
    kennedy: { lat: 27.948, lng: -82.459, label: "Kennedy Blvd" },
    westshore: { lat: 27.944, lng: -82.524, label: "Westshore Blvd" },
    fowler: { lat: 28.055, lng: -82.413, label: "Fowler Ave" },
    brandon: { lat: 27.938, lng: -82.286, label: "Brandon, FL" },
    airport: { lat: 27.976, lng: -82.533, label: "Tampa International Airport" },
    downtown: { lat: 27.948, lng: -82.459, label: "Downtown Tampa" },
    "hyde park": { lat: 27.938, lng: -82.482, label: "Hyde Park" },
    "st pete": { lat: 27.768, lng: -82.64, label: "St Petersburg" },
    "howard frankland": { lat: 27.966, lng: -82.55, label: "Howard Frankland Bridge" },
  };
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(hints)) {
    if (lower.includes(key)) return coords;
  }
  return null;
}
