import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getSpeechProvider } from "@/lib/providers/speech";
import { jsonError, originAllowed, rateLimit } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!rateLimit(`speech:${user.id}`)) return jsonError("Too many speech requests. Type the work instead.", 429);
  const body = await request.json().catch(() => ({}));
  const provider = getSpeechProvider();
  const result = await provider.transcribe({
    audioBase64: body.audioBase64,
    mimeType: body.mimeType,
    mockPhrase: body.mockPhrase ?? body.text,
  });
  return NextResponse.json({
    ...result,
    retention: process.env.AUDIO_RETENTION_ENABLED === "true" ? "audio_may_be_kept" : "audio_not_retained",
  });
}
