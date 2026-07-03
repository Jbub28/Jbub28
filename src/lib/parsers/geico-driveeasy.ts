import { v4 as uuidv4 } from "uuid";
import type { GeicoManualEntry, Trip } from "@/lib/types/driving";

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function entryToTrip(userId: string, entry: GeicoManualEntry): Trip {
  const start = new Date(`${entry.date}T${entry.startTime}`);
  const end = entry.endTime
    ? new Date(`${entry.date}T${entry.endTime}`)
    : undefined;

  const durationMinutes = end
    ? Math.round((end.getTime() - start.getTime()) / 60000)
    : undefined;

  const harshBraking = entry.harshBraking ?? 0;
  const harshAccel = entry.harshAcceleration ?? 0;
  const phoneUse = entry.phoneUseMinutes ?? 0;
  const maxSpeed = entry.maxSpeedMph;

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "personal",
    import_source: "geico_driveeasy",
    external_id: `${entry.date}-${entry.startTime}`,
    start_time: start.toISOString(),
    end_time: end?.toISOString(),
    distance_miles: entry.distanceMiles,
    duration_minutes: durationMinutes,
    start_address: entry.startAddress,
    end_address: entry.endAddress,
    route_polyline: [],
    max_speed_mph: maxSpeed,
    avg_speed_mph:
      entry.distanceMiles && durationMinutes && durationMinutes > 0
        ? Math.round((entry.distanceMiles / durationMinutes) * 60)
        : undefined,
    harsh_braking_count: harshBraking,
    harsh_acceleration_count: harshAccel,
    phone_use_count: phoneUse > 0 ? 1 : 0,
    speeding_events: maxSpeed && maxSpeed > 75 ? 1 : 0,
    time_of_day: getTimeOfDay(start),
    road_type: maxSpeed && maxSpeed > 55 ? "highway" : "local",
    weather: "unknown",
    risk_factors: {
      phone_use_minutes: phoneUse,
      source: "geico_driveeasy",
    },
  };
}

export function parseGeicoManualEntries(
  entries: GeicoManualEntry[],
  userId: string
): Trip[] {
  return entries.map((e) => entryToTrip(userId, e));
}

interface GeicoCsvRow {
  [key: string]: string;
}

function getField(row: GeicoCsvRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const found = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/[\s_-]/g, "") === key.toLowerCase().replace(/[\s_-]/g, "")
    );
    if (found?.[1]) return found[1].trim();
  }
  return undefined;
}

export function parseGeicoCsv(csvText: string, userId: string): Trip[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: GeicoCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)/g) ?? [];
    const row: GeicoCsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }

  const entries: GeicoManualEntry[] = rows.map((row) => ({
    date: getField(row, "date", "tripdate", "startdate") ?? new Date().toISOString().slice(0, 10),
    startTime: getField(row, "starttime", "start", "departuretime") ?? "08:00",
    endTime: getField(row, "endtime", "end", "arrivaltime"),
    distanceMiles: parseFloat(getField(row, "distance", "distancemiles", "miles") ?? "") || undefined,
    maxSpeedMph: parseFloat(getField(row, "maxspeed", "maxspeedmph", "topspeed") ?? "") || undefined,
    harshBraking: parseInt(getField(row, "harshbraking", "hardbraking", "brakingevents") ?? "", 10) || 0,
    harshAcceleration: parseInt(getField(row, "harshacceleration", "hardacceleration") ?? "", 10) || 0,
    phoneUseMinutes: parseFloat(getField(row, "phoneuse", "phoneuseminutes", "distracteddriving") ?? "") || 0,
    startAddress: getField(row, "start", "startaddress", "origin"),
    endAddress: getField(row, "end", "endaddress", "destination"),
  }));

  return parseGeicoManualEntries(entries, userId);
}

export function parseGeicoScreenshotText(text: string): GeicoManualEntry[] {
  const entries: GeicoManualEntry[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let current: Partial<GeicoManualEntry> = {};

  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      if (current.date) entries.push(current as GeicoManualEntry);
      current = { date: normalizeDate(dateMatch[1]) };
    }

    const distMatch = line.match(/(\d+\.?\d*)\s*(mi|miles)/i);
    if (distMatch) current.distanceMiles = parseFloat(distMatch[1]);

    const speedMatch = line.match(/max(?:imum)?\s*speed[:\s]*(\d+)/i);
    if (speedMatch) current.maxSpeedMph = parseInt(speedMatch[1], 10);

    const brakeMatch = line.match(/(?:harsh|hard)\s*brak(?:e|ing)[:\s]*(\d+)/i);
    if (brakeMatch) current.harshBraking = parseInt(brakeMatch[1], 10);

    const phoneMatch = line.match(/phone\s*use[:\s]*(\d+)/i);
    if (phoneMatch) current.phoneUseMinutes = parseInt(phoneMatch[1], 10);
  }

  if (current.date) entries.push(current as GeicoManualEntry);

  return entries.filter((e) => e.date);
}

function normalizeDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export function parseGeicoScreenshotTextToTrips(
  text: string,
  userId: string
): Trip[] {
  return parseGeicoManualEntries(parseGeicoScreenshotText(text), userId);
}
