import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getAiProvider } from "@/lib/providers/ai";
import { schemaForStep, type VoiceSchemaContext } from "@/lib/voice/pageSchemas";
import { jsonError, originAllowed, rateLimit } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!rateLimit(`ai-extract:${user.id}`)) {
    return jsonError("Too many voice requests. Type the fields instead.", 429);
  }
  const body = await request.json().catch(() => ({}));
  const stepKey = String(body.stepKey ?? "");
  const transcript = String(body.transcript ?? "").slice(0, 8000);
  const context = (body.context ?? {}) as VoiceSchemaContext;
  const schema = schemaForStep(stepKey, context);
  if (!schema) {
    return jsonError("This page does not take voice entry.", 400);
  }
  const provider = getAiProvider();
  const result = await provider.extractPageFields({ transcript, schema });
  await writeAudit({
    userId: user.id,
    action: "voice_page_extract",
    entityType: "jrb",
    newValue: {
      stepKey,
      transcript,
      filledKeys: result.fills.map((f) => f.key),
      suggestionKeys: result.suggestions.map((s) => s.key),
      provider: result.provider,
    },
  });
  return NextResponse.json({
    label: "Suggested for Crew Review",
    provider: result.provider,
    model: result.model,
    result,
  });
}
