export type JobLocationFields = {
  jobLocation?: string | null;
  streetAddress?: string | null;
  locationIdentifier?: string | null;
  addressOrCoordinates?: string | null;
  workLocation?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsPermissionGranted?: boolean | null;
  gpsCapturedAt?: Date | string | null;
};

export const LOCATION_FIELD_KEYS = [
  "jobLocation",
  "streetAddress",
  "locationIdentifier",
  "gpsCoordinates",
  "workLocation",
  "addressOrCoordinates",
] as const;

export function formatGps(lat?: number | null, lng?: number | null): string {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return "";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function parseGps(text: string): { latitude: number; longitude: number } | null {
  const m = text.trim().match(/^(-?\d{1,3}\.\d{2,})\s*[, ]\s*(-?\d{1,3}\.\d{2,})$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function composeAddressOrCoordinates(input: JobLocationFields & { gpsCoordinates?: string }): string {
  const gps = input.gpsCoordinates?.trim() || formatGps(input.gpsLatitude, input.gpsLongitude);
  return [input.streetAddress, gps].map((p) => p?.trim()).filter(Boolean).join(" · ");
}

export function locationFromRecord(jrb: JobLocationFields): {
  jobLocation: string;
  streetAddress: string;
  locationIdentifier: string;
  gpsCoordinates: string;
} {
  return {
    jobLocation: (jrb.jobLocation || jrb.workLocation || "").trim(),
    streetAddress: streetFromLegacy(jrb.streetAddress) || streetFromLegacy(jrb.addressOrCoordinates),
    locationIdentifier: (jrb.locationIdentifier || "").trim(),
    gpsCoordinates:
      formatGps(jrb.gpsLatitude, jrb.gpsLongitude) ||
      gpsFromLegacy(jrb.addressOrCoordinates) ||
      gpsFromLegacy(jrb.streetAddress),
  };
}

function streetFromLegacy(combined?: string | null): string {
  const text = combined?.trim() ?? "";
  if (!text) return "";
  if (parseGps(text)) return "";
  return text.split(" · ")[0]?.trim() ?? "";
}

function gpsFromLegacy(combined?: string | null): string {
  const text = combined?.trim() ?? "";
  if (!text) return "";
  if (parseGps(text)) return formatGps(parseGps(text)!.latitude, parseGps(text)!.longitude);
  const parts = text.split(" · ");
  for (const part of parts) {
    const parsed = parseGps(part.trim());
    if (parsed) return formatGps(parsed.latitude, parsed.longitude);
  }
  return "";
}

export function formatJobLocation(jrb: JobLocationFields): string {
  const loc = locationFromRecord(jrb);
  const parts = [loc.jobLocation, loc.streetAddress, loc.locationIdentifier, loc.gpsCoordinates].filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.join(" · ") || "Location not entered";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function persistableLocation(form: Record<string, unknown>): {
  jobLocation: string | null;
  streetAddress: string | null;
  locationIdentifier: string | null;
  workLocation: string | null;
  addressOrCoordinates: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsPermissionGranted: boolean;
  gpsCapturedAt: Date | null;
} {
  const jobLocation = String(form.jobLocation ?? "").trim() || null;
  const streetAddress = String(form.streetAddress ?? "").trim() || null;
  const locationIdentifier = String(form.locationIdentifier ?? "").trim() || null;
  const gpsText = form.gpsCoordinates;
  const parsed = typeof gpsText === "string" ? parseGps(gpsText) : null;
  const gpsCleared = typeof gpsText === "string" && !gpsText.trim();
  const gpsLatitude = gpsCleared ? null : parsed?.latitude ?? asNumber(form.gpsLatitude);
  const gpsLongitude = gpsCleared ? null : parsed?.longitude ?? asNumber(form.gpsLongitude);
  return {
    jobLocation,
    streetAddress,
    locationIdentifier,
    workLocation: jobLocation,
    addressOrCoordinates:
      composeAddressOrCoordinates({
        streetAddress,
        gpsCoordinates: typeof gpsText === "string" ? gpsText : formatGps(gpsLatitude, gpsLongitude),
        gpsLatitude,
        gpsLongitude,
      }) || null,
    gpsLatitude,
    gpsLongitude,
    gpsPermissionGranted: Boolean(form.gpsPermissionGranted),
    gpsCapturedAt: gpsCleared ? null : asDate(form.gpsCapturedAt),
  };
}
