import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { jsonError, originAllowed } from "@/lib/server/http";
import { resolveJobLocation } from "@/lib/server/geocode";

export async function GET(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  await requireUser();
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (!address) return jsonError("Type a street address first.", 400);
  const result = await resolveJobLocation(address);
  return NextResponse.json(result);
}
