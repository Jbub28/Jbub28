import { v4 as uuidv4 } from "uuid";
import type { CrashEvent } from "@/lib/types/crash";

interface SampleCrash {
  road: string;
  city: string;
  county: string;
  lat: number;
  lng: number;
  severity: CrashEvent["severity"];
  dayOrNight: string;
  weather: string;
  light: string;
  speeding: boolean;
  distracted: boolean;
  alcohol: boolean;
  intersection: boolean;
  fatalities: number;
  injuries: number;
  daysAgo: number;
  hour: number;
}

const TAMPA_SAMPLES: SampleCrash[] = [
  { road: "I-275", city: "Tampa", county: "Hillsborough", lat: 27.9701, lng: -82.4765, severity: "incapacitating", dayOrNight: "Night", weather: "Clear", light: "Dark - Lighted", speeding: true, distracted: false, alcohol: false, intersection: false, fatalities: 0, injuries: 2, daysAgo: 12, hour: 22 },
  { road: "I-275", city: "Tampa", county: "Hillsborough", lat: 27.9582, lng: -82.4891, severity: "fatal", dayOrNight: "Night", weather: "Rain", light: "Dark - Lighted", speeding: true, distracted: true, alcohol: true, intersection: false, fatalities: 1, injuries: 1, daysAgo: 45, hour: 1 },
  { road: "Dale Mabry Hwy", city: "Tampa", county: "Hillsborough", lat: 27.9445, lng: -82.5055, severity: "non-incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: true, intersection: true, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 8, hour: 17 },
  { road: "Dale Mabry Hwy", city: "Tampa", county: "Hillsborough", lat: 27.9312, lng: -82.5088, severity: "possible", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 0, daysAgo: 22, hour: 8 },
  { road: "US-41", city: "Tampa", county: "Hillsborough", lat: 27.9421, lng: -82.4582, severity: "incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: false, intersection: false, alcohol: false, fatalities: 0, injuries: 2, daysAgo: 60, hour: 14 },
  { road: "Kennedy Blvd", city: "Tampa", county: "Hillsborough", lat: 27.9475, lng: -82.4589, severity: "non-incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: true, intersection: true, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 15, hour: 12 },
  { road: "Kennedy Blvd", city: "Tampa", county: "Hillsborough", lat: 27.9498, lng: -82.4621, severity: "possible", dayOrNight: "Evening", weather: "Clear", light: "Dusk", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 0, daysAgo: 30, hour: 18 },
  { road: "Fowler Ave", city: "Tampa", county: "Hillsborough", lat: 28.0542, lng: -82.4125, severity: "incapacitating", dayOrNight: "Night", weather: "Clear", light: "Dark - Lighted", speeding: true, distracted: false, alcohol: false, intersection: false, fatalities: 0, injuries: 2, daysAgo: 90, hour: 23 },
  { road: "Fowler Ave", city: "Tampa", county: "Hillsborough", lat: 28.0611, lng: -82.4201, severity: "non-incapacitating", dayOrNight: "Day", weather: "Rain", light: "Daylight", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 40, hour: 16 },
  { road: "Bruce B Downs Blvd", city: "Tampa", county: "Hillsborough", lat: 28.0688, lng: -82.3865, severity: "fatal", dayOrNight: "Night", weather: "Clear", light: "Dark - Not Lighted", speeding: true, distracted: true, alcohol: true, intersection: false, fatalities: 1, injuries: 0, daysAgo: 120, hour: 2 },
  { road: "SR-60", city: "Brandon", county: "Hillsborough", lat: 27.9378, lng: -82.2859, severity: "incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: true, distracted: false, alcohol: false, intersection: false, fatalities: 0, injuries: 2, daysAgo: 55, hour: 7 },
  { road: "SR-60", city: "Brandon", county: "Hillsborough", lat: 27.9285, lng: -82.3012, severity: "non-incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: true, intersection: true, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 18, hour: 17 },
  { road: "Westshore Blvd", city: "Tampa", county: "Hillsborough", lat: 27.9436, lng: -82.5236, severity: "possible", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 0, daysAgo: 10, hour: 9 },
  { road: "Westshore Blvd", city: "Tampa", county: "Hillsborough", lat: 27.9512, lng: -82.5311, severity: "incapacitating", dayOrNight: "Evening", weather: "Rain", light: "Dark - Lighted", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 2, daysAgo: 75, hour: 19 },
  { road: "Memorial Hwy", city: "Tampa", county: "Hillsborough", lat: 27.9756, lng: -82.5332, severity: "non-incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: true, intersection: false, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 25, hour: 15 },
  { road: "Howard Frankland Bridge", city: "Tampa", county: "Hillsborough", lat: 27.9651, lng: -82.5542, severity: "fatal", dayOrNight: "Night", weather: "Fog", light: "Dark - Lighted", speeding: true, distracted: false, alcohol: false, intersection: false, fatalities: 1, injuries: 2, daysAgo: 200, hour: 5 },
  { road: "Howard Frankland Bridge", city: "Tampa", county: "Hillsborough", lat: 27.9688, lng: -82.5488, severity: "incapacitating", dayOrNight: "Day", weather: "Rain", light: "Daylight", speeding: false, distracted: false, alcohol: false, intersection: false, fatalities: 0, injuries: 3, daysAgo: 35, hour: 8 },
  { road: "Armenia Ave", city: "Tampa", county: "Hillsborough", lat: 27.9555, lng: -82.4921, severity: "non-incapacitating", dayOrNight: "Day", weather: "Clear", light: "Daylight", speeding: false, distracted: false, intersection: true, alcohol: false, fatalities: 0, injuries: 1, daysAgo: 14, hour: 11 },
  { road: "Himes Ave", city: "Tampa", county: "Hillsborough", lat: 27.9188, lng: -82.5012, severity: "possible", dayOrNight: "Night", weather: "Clear", light: "Dark - Lighted", speeding: true, distracted: true, intersection: false, alcohol: false, fatalities: 0, injuries: 0, daysAgo: 50, hour: 21 },
  { road: "Nebraska Ave", city: "Tampa", county: "Hillsborough", lat: 27.9621, lng: -82.4512, severity: "incapacitating", dayOrNight: "Night", weather: "Clear", light: "Dark - Lighted", speeding: false, distracted: false, intersection: true, alcohol: true, fatalities: 0, injuries: 2, daysAgo: 85, hour: 0 },
];

function daysAgoToDate(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

export function generateSignal4SampleData(userId: string): CrashEvent[] {
  return TAMPA_SAMPLES.map((s, i) => ({
    id: uuidv4(),
    user_id: userId,
    data_source: "signal4" as const,
    import_source: "signal4_analytics" as const,
    report_number: `S4-SAMPLE-${10000 + i}`,
    crash_datetime: daysAgoToDate(s.daysAgo, s.hour),
    latitude: s.lat,
    longitude: s.lng,
    county_name: s.county,
    city_name: s.city,
    road_name: s.road,
    severity: s.severity,
    severity_detail: s.severity,
    light_condition: s.light,
    weather_condition: s.weather,
    day_or_night: s.dayOrNight,
    crash_type: s.intersection ? "Intersection" : "Lane Departure",
    is_speeding_related: s.speeding,
    is_distracted: s.distracted,
    is_alcohol_related: s.alcohol,
    is_intersection_related: s.intersection,
    is_pedestrian_involved: false,
    is_bicyclist_involved: false,
    fatality_count: s.fatalities,
    injury_count: s.injuries,
    vehicle_count: 2,
    risk_factors: { sample: true, source: "signal4_analytics" },
  }));
}
