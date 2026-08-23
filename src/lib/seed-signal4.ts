import { generateSignal4SampleData } from "@/lib/data/signal4-sample";
import { identifyHighRiskCorridors } from "@/lib/risk/corridors";
import { calculateAreaRiskScore } from "@/lib/risk/scoring";
import {
  getUserId,
  logImport,
  saveAreaRiskScore,
  saveCorridors,
  saveCrashes,
} from "@/lib/supabase/storage";

export async function seedSignal4SampleData(): Promise<{
  crashCount: number;
  safetyIndex: number;
}> {
  const userId = await getUserId();
  const crashes = generateSignal4SampleData(userId);

  await saveCrashes(crashes);
  const corridors = identifyHighRiskCorridors(crashes, userId);
  await saveCorridors(corridors);
  const score = calculateAreaRiskScore(crashes, userId);
  await saveAreaRiskScore(score);
  await logImport("signal4_analytics", crashes.length, "success");

  return { crashCount: crashes.length, safetyIndex: score.safety_index };
}
