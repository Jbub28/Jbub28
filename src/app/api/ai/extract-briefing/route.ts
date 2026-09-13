import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { jsonError, originAllowed, rateLimit } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";
import { loadBriefingCatalog } from "@/lib/conversation/loadCatalog";
import { BriefingExtractionSchema } from "@/lib/conversation/types";
import { getAiProvider } from "@/lib/providers/ai";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!rateLimit(`ai-briefing:${user.id}`)) {
    return jsonError("Too many voice requests. Type instead.", 429);
  }
  const body = await request.json().catch(() => ({}));
  const transcript = String(body.transcript ?? "").slice(0, 12_000);
  if (!transcript.trim()) return jsonError("No words were captured. Talk again or type.", 400);

  try {
    const catalog = await loadBriefingCatalog();
    const provider = getAiProvider();
    const result = await provider.extractBriefing({ transcript, catalog });
    const parsed = BriefingExtractionSchema.parse(result);
    await writeAudit({
      userId: user.id,
      action: "voice_briefing_extract",
      entityType: "jrb",
      entityId: body.jrbId ? String(body.jrbId) : undefined,
      newValue: {
        filled: parsed.facts.filter((f) => f.displayOnJrb).map((f) => f.key),
        suggestedHe: parsed.highEnergy.map((h) => h.key),
        followUps: parsed.followUps.map((f) => f.key),
        provider: parsed.provider,
        audioDiscarded: true,
      },
    });
    return NextResponse.json({
      label: "Suggested for Crew Review",
      result: parsed,
    });
  } catch {
    return jsonError("We could not match that discussion. Type the job, or try Talk again.", 503);
  }
}
