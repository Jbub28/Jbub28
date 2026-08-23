export interface YearlySummary {
  year: number;
  fatalities: number;
  seriousInjuries: number;
  totalCrashes: number;
  fatalitiesChangePct?: number;
  seriousInjuriesChangePct?: number;
  totalCrashesChangePct?: number;
}

export interface DayOfWeekStats {
  year: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  total: number;
}

export interface EmphasisAreaStats {
  name: string;
  fatalities: Partial<Record<number, number>>;
  seriousInjuries: Partial<Record<number, number>>;
}

export interface Signal4StateReport {
  id: string;
  user_id: string;
  report_title: string;
  data_through: string;
  last_updated: string;
  preliminary_note?: string;
  yearly_summary: YearlySummary[];
  crashes_by_day: DayOfWeekStats[];
  fatalities_by_day: DayOfWeekStats[];
  serious_injuries_by_day: DayOfWeekStats[];
  emphasis_areas: EmphasisAreaStats[];
  imported_at: string;
}

export type DayOfWeekKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayOfWeekKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dateToDayKey(date: Date): DayOfWeekKey {
  return DAY_KEYS[date.getDay()];
}

export function dayLabel(key: DayOfWeekKey): string {
  return { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" }[key];
}
