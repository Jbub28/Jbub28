import { v4 as uuidv4 } from "uuid";
import type { CrashEvent, CrashSeverity } from "@/lib/types/crash";
import { parseSeverity } from "@/lib/types/crash";

type CsvRow = Record<string, string>;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_\-./()]/g, "");
}

function getField(row: CsvRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const target = normalizeKey(key);
    const found = Object.entries(row).find(([k]) => normalizeKey(k) === target);
    if (found?.[1]?.trim()) return found[1].trim();
  }
  return undefined;
}

function parseBool(val?: string): boolean {
  if (!val) return false;
  const s = val.toLowerCase();
  return s === "y" || s === "yes" || s === "true" || s === "1";
}

function parseIntSafe(val?: string): number {
  if (!val) return 0;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseFloatSafe(val?: string): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : undefined;
}

function parseCrashDateTime(row: CsvRow): string | null {
  const combined = getField(
    row,
    "Crash Date and Time",
    "Crash Date And Time",
    "CrashDateTime",
    "crash_date_time"
  );
  if (combined) {
    const d = new Date(combined);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const date = getField(row, "Crash Date", "Crash Year", "crash_date");
  const time = getField(row, "Crash Time", "crash_time");
  if (date) {
    const d = new Date(time ? `${date} ${time}` : date);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function inferSeverity(row: CsvRow): CrashSeverity {
  const explicit = getField(
    row,
    "S4 Crash Severity",
    "S4 Crash Severity Detail",
    "Crash Severity",
    "severity"
  );
  if (explicit) return parseSeverity(explicit);

  const fatalities = parseIntSafe(
    getField(row, "S4 Fatality Count", "Fatality Count", "fatalities")
  );
  if (fatalities > 0) return "fatal";

  const incap = parseIntSafe(
    getField(row, "S4 Incapacitating Injury Count", "Incapacitating Injuries")
  );
  if (incap > 0) return "incapacitating";

  const injuries = parseIntSafe(
    getField(row, "S4 Injury Count", "Injury Count", "injuries")
  );
  if (injuries > 0) return "non-incapacitating";

  return "unknown";
}

function rowToCrash(row: CsvRow, userId: string): CrashEvent | null {
  const lat =
    parseFloatSafe(getField(row, "Latitude", "S4 Latitude", "latitude", "lat")) ??
    parseFloatSafe(getField(row, "Y", "y"));
  const lng =
    parseFloatSafe(getField(row, "Longitude", "S4 Longitude", "longitude", "lng", "lon")) ??
    parseFloatSafe(getField(row, "X", "x"));

  if (lat == null || lng == null) return null;
  if (lat < 24 || lat > 31 || lng > -80 || lng < -88) {
    // Florida bounds check (loose)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  }

  const crashDatetime = parseCrashDateTime(row);
  if (!crashDatetime) return null;

  const reportNumber =
    getField(row, "Report Number", "Report_Number", "report_number") ?? uuidv4();

  const severity = inferSeverity(row);

  return {
    id: uuidv4(),
    user_id: userId,
    data_source: "signal4",
    import_source: "signal4_analytics",
    report_number: reportNumber,
    crash_datetime: crashDatetime,
    latitude: lat,
    longitude: lng,
    county_name: getField(row, "County Name", "County", "county_name"),
    city_name: getField(row, "City Name", "City", "city_name"),
    road_name: getField(
      row,
      "On Street, Road, Highway",
      "On Street Road Highway",
      "Road Name",
      "road_name"
    ),
    severity,
    severity_detail: getField(row, "S4 Crash Severity Detail", "Severity Detail"),
    light_condition: getField(row, "Light Condition", "light_condition"),
    weather_condition: getField(row, "Weather Condition", "weather_condition"),
    road_surface: getField(row, "Road Surface Condition", "road_surface"),
    day_or_night: getField(row, "S4 Day or Night", "Day or Night"),
    crash_type: getField(row, "S4 Crash Type", "S4 Crash Type Simplified", "Crash Type"),
    is_speeding_related: parseBool(
      getField(row, "S4 Is Speeding Related", "Speeding Related")
    ),
    is_distracted: parseBool(getField(row, "S4 Is Distracted", "Distracted")),
    is_alcohol_related: parseBool(
      getField(row, "S4 Is Alcohol Related", "Alcohol Related")
    ),
    is_intersection_related: parseBool(
      getField(row, "S4 Is Intersection Related", "Intersection Related")
    ),
    is_pedestrian_involved: parseBool(
      getField(row, "S4 Is Pedestrian Involved", "Pedestrian Involved")
    ),
    is_bicyclist_involved: parseBool(
      getField(row, "S4 Is Bicyclist Involved", "Bicyclist Involved")
    ),
    fatality_count: parseIntSafe(
      getField(row, "S4 Fatality Count", "Fatality Count")
    ),
    injury_count: parseIntSafe(getField(row, "S4 Injury Count", "Injury Count")),
    vehicle_count: parseIntSafe(
      getField(row, "Total Number of Vehicles", "Vehicle Count")
    ),
    risk_factors: {
      source: "signal4_analytics",
      rural_or_urban: getField(row, "Rural or Urban"),
      work_zone: getField(row, "Crash in Work Zone"),
    },
  };
}

function parseCsvRows(csvText: string): CsvRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].match(/(".*?"|[^,]+)/g) ?? [];
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "").trim();
    });
    rows.push(row);
  }
  return rows;
}

export function parseSignal4Csv(csvText: string, userId: string): CrashEvent[] {
  const rows = parseCsvRows(csvText);
  const crashes: CrashEvent[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const crash = rowToCrash(row, userId);
    if (!crash) continue;
    const key = crash.report_number;
    if (seen.has(key)) continue;
    seen.add(key);
    crashes.push(crash);
  }

  return crashes;
}

export function parseSignal4Json(raw: unknown, userId: string): CrashEvent[] {
  if (!Array.isArray(raw)) {
    throw new Error("Expected JSON array of crash records");
  }

  const crashes: CrashEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const crash = rowToCrash(item as CsvRow, userId);
    if (crash) crashes.push(crash);
  }
  return crashes;
}
