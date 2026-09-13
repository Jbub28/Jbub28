import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/server/audit";
import { originAllowed, jsonError } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await getSessionUser();
  await clearSessionCookie();
  if (user) await writeAudit({ userId: user.id, action: "sign_out", entityType: "user", entityId: user.id });
  return NextResponse.json({ ok: true });
}
