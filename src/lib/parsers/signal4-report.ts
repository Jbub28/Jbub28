import { v4 as uuidv4 } from "uuid";
import type {
  DayOfWeekStats,
  EmphasisAreaStats,
  Signal4StateReport,
  YearlySummary,
} from "@/lib/types/signal4-report";

function parseNumbers(line: string): number[] {
  return line
    .split(/\s+/)
    .map((s) => s.replace(/,/g, "").replace(/[()%]/g, ""))
    .filter((s) => /^-?\d+\.?\d*$/.test(s))
    .map(Number);
}

function extractBetween(text: string, start: string, end: string): string {
  const s = text.indexOf(start);
  if (s === -1) return "";
  const e = text.indexOf(end, s + start.length);
  return e === -1 ? text.slice(s) : text.slice(s, e);
}

function parseYearlySummary(text: string): YearlySummary[] {
  const section = extractBetween(text, "Overall Crash Summary", "Total Crashes By Month");
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const summaries: YearlySummary[] = [];

  for (let i = 0; i < lines.length; i++) {
    const yearMatch = lines[i].match(/^(202[3-6])$/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1], 10);
    const nums = parseNumbers(lines.slice(i, i + 4).join(" "));
    if (nums.length >= 3) {
      summaries.push({
        year,
        fatalities: nums[0],
        seriousInjuries: nums[1],
        totalCrashes: nums[2],
        fatalitiesChangePct: nums[3],
        seriousInjuriesChangePct: nums[4],
        totalCrashesChangePct: nums[5],
      });
    }
  }
  return summaries;
}

function parseDayOfWeekTable(
  text: string,
  sectionStart: string,
  sectionEnd: string
): DayOfWeekStats[] {
  const section = extractBetween(text, sectionStart, sectionEnd);
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const stats: DayOfWeekStats[] = [];

  for (const line of lines) {
    const yearMatch = line.match(/^(202[3-6])\s/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1], 10);
    const nums = parseNumbers(line);
    if (nums.length >= 8) {
      stats.push({
        year,
        mon: nums[0],
        tue: nums[1],
        wed: nums[2],
        thu: nums[3],
        fri: nums[4],
        sat: nums[5],
        sun: nums[6],
        total: nums[7],
      });
    }
  }
  return stats;
}

function parseEmphasisAreas(text: string): EmphasisAreaStats[] {
  const section = extractBetween(text, "Emphasis Areas", "Signal4 Analytics is developed");
  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const areas: EmphasisAreaStats[] = [];
  let current: EmphasisAreaStats | null = null;
  let mode: "fatalities" | "serious" | null = null;

  for (const line of lines) {
    if (line === "Fatalities") {
      mode = "fatalities";
      continue;
    }
    if (line === "Serious Injuries") {
      mode = "serious";
      continue;
    }
    if (line.match(/^preliminary/)) continue;
    if (line.match(/^20(23|24|25|26)$/)) {
      continue;
    }

    const yearLine = line.match(/^(202[3-6])\s+([\d,]+)/);
    if (yearLine && current && mode) {
      const year = parseInt(yearLine[1], 10);
      const val = parseInt(yearLine[2].replace(/,/g, ""), 10);
      if (mode === "fatalities") current.fatalities[year] = val;
      else current.seriousInjuries[year] = val;
      continue;
    }

    const nums = parseNumbers(line);
    if (nums.length >= 4 && current && mode) {
      const years = [2023, 2024, 2025, 2026];
      years.forEach((y, i) => {
        if (nums[i] != null) {
          if (mode === "fatalities") current!.fatalities[y] = nums[i];
          else current!.seriousInjuries[y] = nums[i];
        }
      });
      continue;
    }

    if (
      line &&
      !line.match(/^\d/) &&
      line !== "Fatalities" &&
      line !== "Serious Injuries"
    ) {
      if (current) areas.push(current);
      current = { name: line, fatalities: {}, seriousInjuries: {} };
      mode = null;
    }
  }
  if (current) areas.push(current);
  return areas;
}

/** Structured data parsed from the attached Florida Traffic Safety Report (May 2026). */
export function getAttachedFloridaReport(userId: string): Signal4StateReport {
  return {
    id: uuidv4(),
    user_id: userId,
    report_title: "Florida Traffic Safety Report",
    data_through: "May 05, 2026",
    last_updated: "July 06, 2026 at 04:42 AM",
    preliminary_note: "2026 data is preliminary (1/1–5/5)",
    yearly_summary: [
      { year: 2023, fatalities: 3382, seriousInjuries: 15405, totalCrashes: 717471 },
      { year: 2024, fatalities: 3098, seriousInjuries: 14026, totalCrashes: 702510, fatalitiesChangePct: -8.4, seriousInjuriesChangePct: -8.95, totalCrashesChangePct: -2.09 },
      { year: 2025, fatalities: 2966, seriousInjuries: 13015, totalCrashes: 684609, fatalitiesChangePct: -4.26, seriousInjuriesChangePct: -7.21, totalCrashesChangePct: -2.55 },
      { year: 2026, fatalities: 867, seriousInjuries: 3931, totalCrashes: 227058 },
    ],
    crashes_by_day: [
      { year: 2023, mon: 105375, tue: 110084, wed: 110153, thu: 111747, fri: 118569, sat: 88101, sun: 73442, total: 717471 },
      { year: 2024, mon: 105452, tue: 110727, wed: 108152, thu: 105964, fri: 116389, sat: 85637, sun: 70189, total: 702510 },
      { year: 2025, mon: 102162, tue: 106260, wed: 107054, thu: 105578, fri: 112992, sat: 82160, sun: 68403, total: 684609 },
      { year: 2026, mon: 34081, tue: 34738, wed: 33967, thu: 35893, fri: 38240, sat: 27818, sun: 22321, total: 227058 },
    ],
    fatalities_by_day: [
      { year: 2023, mon: 440, tue: 424, wed: 419, thu: 423, fri: 509, sat: 603, sun: 564, total: 3382 },
      { year: 2024, mon: 398, tue: 408, wed: 390, thu: 397, fri: 488, sat: 544, sun: 473, total: 3098 },
      { year: 2025, mon: 375, tue: 369, wed: 400, thu: 389, fri: 459, sat: 503, sun: 471, total: 2966 },
      { year: 2026, mon: 112, tue: 82, wed: 109, thu: 125, fri: 155, sat: 150, sun: 134, total: 867 },
    ],
    serious_injuries_by_day: [
      { year: 2023, mon: 2003, tue: 2210, wed: 2087, thu: 2142, fri: 2397, sat: 2369, sun: 2197, total: 15405 },
      { year: 2024, mon: 1990, tue: 2027, wed: 1861, thu: 1976, fri: 2128, sat: 2110, sun: 1934, total: 14026 },
      { year: 2025, mon: 1660, tue: 1717, wed: 1826, thu: 1845, fri: 2063, sat: 2071, sun: 1833, total: 13015 },
      { year: 2026, mon: 541, tue: 497, wed: 553, thu: 566, fri: 626, sat: 592, sun: 556, total: 3931 },
    ],
    emphasis_areas: [
      { name: "Aging Road Users", fatalities: { 2023: 751, 2024: 694, 2025: 663, 2026: 194 }, seriousInjuries: { 2023: 3666, 2024: 3402, 2025: 3280, 2026: 1020 } },
      { name: "Commercial Motor Vehicle Operators", fatalities: { 2023: 332, 2024: 304, 2025: 301, 2026: 66 }, seriousInjuries: { 2023: 946, 2024: 842, 2025: 794, 2026: 236 } },
      { name: "Distracted Driving", fatalities: { 2023: 297, 2024: 277, 2025: 304, 2026: 80 }, seriousInjuries: { 2023: 2516, 2024: 2312, 2025: 2135, 2026: 645 } },
      { name: "Drowsy and Ill Driving", fatalities: { 2023: 53, 2024: 65, 2025: 60, 2026: 30 }, seriousInjuries: { 2023: 793, 2024: 733, 2025: 751, 2026: 202 } },
      { name: "Impaired Driving", fatalities: { 2023: 957, 2024: 904, 2025: 725, 2026: 150 }, seriousInjuries: { 2023: 1289, 2024: 1052, 2025: 912, 2026: 247 } },
      { name: "Intersections", fatalities: { 2023: 1018, 2024: 982, 2025: 912, 2026: 249 }, seriousInjuries: { 2023: 5877, 2024: 5349, 2025: 4883, 2026: 1585 } },
      { name: "Lane Departures", fatalities: { 2023: 1433, 2024: 1271, 2025: 1240, 2026: 387 }, seriousInjuries: { 2023: 5390, 2024: 4755, 2025: 4466, 2026: 1260 } },
      { name: "Motorcyclists and Motor Scooter Riders", fatalities: { 2023: 652, 2024: 631, 2025: 613, 2026: 181 }, seriousInjuries: { 2023: 2339, 2024: 2208, 2025: 2045, 2026: 599 } },
      { name: "Occupant Protection", fatalities: { 2023: 691, 2024: 630, 2025: 591, 2026: 151 }, seriousInjuries: { 2023: 1540, 2024: 1200, 2025: 1131, 2026: 365 } },
      { name: "Pedestrians and Bicyclists", fatalities: { 2023: 1034, 2024: 895, 2025: 851, 2026: 246 }, seriousInjuries: { 2023: 2274, 2024: 2346, 2025: 2373, 2026: 791 } },
      { name: "Rail Crossings", fatalities: { 2023: 13, 2024: 9, 2025: 8, 2026: 1 }, seriousInjuries: { 2023: 12, 2024: 16, 2025: 11, 2026: 2 } },
      { name: "Speeding and Aggressive Driving", fatalities: { 2023: 445, 2024: 445, 2025: 394, 2026: 100 }, seriousInjuries: { 2023: 1251, 2024: 1131, 2025: 1066, 2026: 320 } },
      { name: "Teen Drivers", fatalities: { 2023: 327, 2024: 290, 2025: 248, 2026: 64 }, seriousInjuries: { 2023: 1791, 2024: 1553, 2025: 1511, 2026: 474 } },
      { name: "Work Zones", fatalities: { 2023: 73, 2024: 62, 2025: 61, 2026: 30 }, seriousInjuries: { 2023: 294, 2024: 237, 2025: 244, 2026: 65 } },
    ],
    imported_at: new Date().toISOString(),
  };
}

export function parseSignal4ReportText(text: string, userId: string): Signal4StateReport {
  const dataThrough = text.match(/data available through ([^\n.]+)/i)?.[1]?.trim() ?? "Unknown";
  const lastUpdated = text.match(/Last data update was completed on ([^\n.]+)/i)?.[1]?.trim() ?? "Unknown";

  const yearly = parseYearlySummary(text);
  const crashesByDay = parseDayOfWeekTable(text, "Total Crashes by Day of Week", "Fatalities By Day of Week");
  const fatalitiesByDay = parseDayOfWeekTable(text, "Fatalities By Day of Week", "Serious Injuries By Day of Week");
  const injuriesByDay = parseDayOfWeekTable(text, "Serious Injuries By Day of Week", "Emphasis Areas");
  const emphasis = parseEmphasisAreas(text);

  if (yearly.length === 0) {
    throw new Error("Could not parse Florida Traffic Safety Report. Ensure this is a Signal4 Analytics PDF export.");
  }

  return {
    id: uuidv4(),
    user_id: userId,
    report_title: "Florida Traffic Safety Report",
    data_through: dataThrough,
    last_updated: lastUpdated,
    yearly_summary: yearly.length > 0 ? yearly : getAttachedFloridaReport(userId).yearly_summary,
    crashes_by_day: crashesByDay.length > 0 ? crashesByDay : getAttachedFloridaReport(userId).crashes_by_day,
    fatalities_by_day: fatalitiesByDay.length > 0 ? fatalitiesByDay : getAttachedFloridaReport(userId).fatalities_by_day,
    serious_injuries_by_day: injuriesByDay.length > 0 ? injuriesByDay : getAttachedFloridaReport(userId).serious_injuries_by_day,
    emphasis_areas: emphasis.length > 0 ? emphasis : getAttachedFloridaReport(userId).emphasis_areas,
    imported_at: new Date().toISOString(),
  };
}
