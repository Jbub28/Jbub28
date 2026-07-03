import { generateDemoTrips } from "@/lib/demo-data";
import { identifyCommonRoutes } from "@/lib/risk/routes";
import { calculateRiskScore } from "@/lib/risk/scoring";
import {
  getUserId,
  logImport,
  saveCommonRoutes,
  saveRiskScore,
  saveTrips,
} from "@/lib/supabase/storage";

export async function seedDemoData(): Promise<{
  tripCount: number;
  safetyScore: number;
}> {
  const userId = await getUserId();
  const trips = generateDemoTrips(userId);

  await saveTrips(trips);
  const routes = identifyCommonRoutes(trips, userId);
  await saveCommonRoutes(routes);
  const score = calculateRiskScore(trips, userId);
  await saveRiskScore(score);
  await logImport("manual", trips.length, "success");

  return { tripCount: trips.length, safetyScore: score.safety_score };
}
