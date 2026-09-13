import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { jsonError, originAllowed } from "@/lib/server/http";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  const body = await request.json();
  const jrbId = String(body.jrbId ?? "");
  const jrb = await prisma.jrbRecord.findUnique({ where: { id: jrbId } });
  if (!jrb || jrb.organizationId !== user.organizationId) return jsonError("Job brief not found.", 404);
  if (body.clientRevision && body.serverRevision && body.clientRevision !== body.serverRevision) {
    await prisma.jrbRecord.update({ where: { id: jrbId }, data: { syncStatus: "conflict" } });
    return NextResponse.json(
      {
        status: "conflict",
        message: "This brief changed on another device. Keep this device, keep the server, or review each field.",
      },
      { status: 409 },
    );
  }
  await prisma.jrbRecord.update({ where: { id: jrbId }, data: { syncStatus: "synchronized" } });
  return NextResponse.json({ status: "synchronized" });
}
