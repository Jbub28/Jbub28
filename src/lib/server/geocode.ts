import { formatGps } from "@/lib/domain/jobLocation";
import { formatTraumaHospital, nearestTraumaHospital, type NearestTraumaHospital } from "@/lib/domain/traumaCenters";

export type GeocodedPlace = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  gpsCoordinates: string;
  source: "google" | "nominatim";
};

export type LocationResolveResult = {
  geocode: GeocodedPlace | null;
  hospital: NearestTraumaHospital | null;
  hospitalText: string;
  notice: string;
};

function looksLikePole(query: string): boolean {
  return /^(pole|poteet|structure|tower)\s/i.test(query.trim());
}

async function geocodeGoogle(query: string, key: string): Promise<GeocodedPlace | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    results?: { formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }[];
  };
  const hit = data.results?.[0];
  const loc = hit?.geometry?.location;
  if (!hit || loc == null || data.status !== "OK") return null;
  return {
    formattedAddress: hit.formatted_address || query,
    latitude: loc.lat,
    longitude: loc.lng,
    gpsCoordinates: formatGps(loc.lat, loc.lng),
    source: "google",
  };
}

async function geocodeNominatim(query: string): Promise<GeocodedPlace | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "EnergyGuard-JRB/1.0 (electric-delivery-job-brief)",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const hit = data[0];
  if (!hit?.lat || !hit?.lon) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return {
    formattedAddress: hit.display_name || query,
    latitude,
    longitude,
    gpsCoordinates: formatGps(latitude, longitude),
    source: "nominatim",
  };
}

export async function geocodeAddress(query: string): Promise<GeocodedPlace | null> {
  const text = query.trim();
  if (!text || looksLikePole(text) || text.length < 5) return null;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
  if (googleKey) {
    try {
      const google = await geocodeGoogle(text, googleKey);
      if (google) return google;
    } catch {
      /* fall through to OpenStreetMap */
    }
  }
  try {
    return await geocodeNominatim(text);
  } catch {
    return null;
  }
}

export async function resolveJobLocation(query: string): Promise<LocationResolveResult> {
  const geocode = await geocodeAddress(query);
  if (!geocode) {
    return {
      geocode: null,
      hospital: null,
      hospitalText: "",
      notice: "Could not match that address on the map. Type the street and GPS if you know them.",
    };
  }
  const hospital = nearestTraumaHospital({ latitude: geocode.latitude, longitude: geocode.longitude });
  if (!hospital) {
    return {
      geocode,
      hospital: null,
      hospitalText: "",
      notice: `Mapped the job (${geocode.source === "google" ? "Google Maps" : "OpenStreetMap"}). No Level I or II trauma hospital was found within 150 miles — type the 911 hospital.`,
    };
  }
  return {
    geocode,
    hospital,
    hospitalText: formatTraumaHospital(hospital),
    notice: `Mapped the job and the nearest ${hospital.level} trauma hospital.`,
  };
}
