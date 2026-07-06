import { v4 as uuidv4 } from "uuid";
import type { Trip } from "@/lib/types/driving";

const TAMPA_ROUTES = [
  {
    name: "Home → Downtown Tampa",
    start: { lat: 27.9506, lng: -82.4572, address: "Hyde Park, Tampa, FL" },
    end: { lat: 27.9475, lng: -82.4589, address: "Downtown Tampa, FL" },
    distance: 3.2,
    duration: 12,
    timeOfDay: "morning" as const,
    harshBraking: 0,
    phoneUse: 0,
    maxSpeed: 35,
  },
  {
    name: "Home → Westshore",
    start: { lat: 27.9506, lng: -82.4572, address: "Hyde Park, Tampa, FL" },
    end: { lat: 27.9436, lng: -82.5236, address: "Westshore, Tampa, FL" },
    distance: 5.8,
    duration: 18,
    timeOfDay: "evening" as const,
    harshBraking: 1,
    phoneUse: 0,
    maxSpeed: 48,
  },
  {
    name: "Home → TIA Airport",
    start: { lat: 27.9506, lng: -82.4572, address: "Hyde Park, Tampa, FL" },
    end: { lat: 27.9756, lng: -82.5332, address: "Tampa International Airport" },
    distance: 8.4,
    duration: 22,
    timeOfDay: "afternoon" as const,
    harshBraking: 0,
    phoneUse: 1,
    maxSpeed: 55,
  },
  {
    name: "Home → Brandon",
    start: { lat: 27.9506, lng: -82.4572, address: "Hyde Park, Tampa, FL" },
    end: { lat: 27.9378, lng: -82.2859, address: "Brandon, FL" },
    distance: 14.2,
    duration: 28,
    timeOfDay: "morning" as const,
    harshBraking: 2,
    phoneUse: 0,
    maxSpeed: 68,
  },
  {
    name: "Home → St Pete",
    start: { lat: 27.9506, lng: -82.4572, address: "Hyde Park, Tampa, FL" },
    end: { lat: 27.7676, lng: -82.6403, address: "St Petersburg, FL" },
    distance: 22.5,
    duration: 35,
    timeOfDay: "night" as const,
    harshBraking: 1,
    phoneUse: 1,
    maxSpeed: 72,
  },
];

function interpolateRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  points = 8
) {
  const polyline = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    polyline.push({
      lat: start.lat + (end.lat - start.lat) * t + (Math.random() - 0.5) * 0.002,
      lng: start.lng + (end.lng - start.lng) * t + (Math.random() - 0.5) * 0.002,
    });
  }
  return polyline;
}

function daysAgo(n: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

export function generateDemoTrips(userId: string): Trip[] {
  const trips: Trip[] = [];
  const timeSlots = [7, 8, 17, 18, 21, 22];

  for (let day = 1; day <= 30; day++) {
    const route = TAMPA_ROUTES[day % TAMPA_ROUTES.length];
    const hour = timeSlots[day % timeSlots.length];
    const start = daysAgo(day, hour);
    const end = new Date(start.getTime() + route.duration * 60000);

  const tod =
      hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";

    trips.push({
      id: uuidv4(),
      user_id: userId,
      data_source: "personal",
      import_source: day % 3 === 0 ? "geico_driveeasy" : "google_takeout",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      distance_miles: route.distance + (Math.random() - 0.5),
      duration_minutes: route.duration,
      start_lat: route.start.lat,
      start_lng: route.start.lng,
      end_lat: route.end.lat,
      end_lng: route.end.lng,
      start_address: route.start.address,
      end_address: route.end.address,
      route_polyline: interpolateRoute(route.start, route.end),
      max_speed_mph: route.maxSpeed + Math.floor(Math.random() * 5),
      avg_speed_mph: Math.round((route.distance / route.duration) * 60),
      harsh_braking_count: route.harshBraking,
      harsh_acceleration_count: Math.random() > 0.7 ? 1 : 0,
      phone_use_count: route.phoneUse,
      speeding_events: route.maxSpeed > 65 ? 1 : 0,
      weather: ["clear", "clear", "rain"][day % 3],
      road_type: route.maxSpeed > 55 ? "highway" : "local",
      time_of_day: tod,
    });
  }

  return trips;
}
