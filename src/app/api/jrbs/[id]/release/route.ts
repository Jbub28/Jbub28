import { NextRequest, NextResponse } from "next/server";
import { JrbStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canReleaseJrb } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/server/audit";
import { jsonError, originAllowed } from "@/lib/server/http";
import { buildReadiness, snapshotLibraries } from "@/lib/server/jrbReadiness";
import { READY_NOTICE } from "@/lib/domain/readiness";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canReleaseJrb(user.roles)) return jsonError("Only the Employee in Charge can release this brief.", 403);
  const { id } = await context.params;
  const jrb = await prisma.jrbRecord.findUnique({ where: { id } });
  if (!jrb) return jsonError("Job brief not found.", 404);
  if (jrb.syncStatus !== "synchronized") {
    return jsonError("This brief is not synchronized. It cannot be released yet.", 409);
  }
  const version = await prisma.jrbVersion.findFirst({ where: { jrbId: id }, orderBy: { versionNumber: "desc" } });
  if (!version) return jsonError("No version.", 400);
  const readiness = await buildReadiness(version.id);
  if (!readiness.canRelease) {
    return NextResponse.json(
      { error: "This brief is not ready for work.", readiness },
      { status: 409 },
    );
  }
  const snapshot = await snapshotLibraries();
  await prisma.jrbVersion.update({
    where: { id: version.id },
    data: {
      status: JrbStatus.released_for_work,
      releasedAt: new Date(),
      releasedById: user.id,
      releasedRole: user.roles.join(","),
      controlledLibrarySnapshot: snapshot,
    },
  });
  await prisma.jrbRecord.update({
    where: { id },
    data: { status: JrbStatus.released_for_work, syncStatus: "synchronized" },
  });
  await writeAudit({
    userId: user.id,
    action: "jrb_release",
    entityType: "jrb_version",
    entityId: version.id,
    newValue: { version: version.versionNumber, snapshot },
  });
  return NextResponse.json({ status: "Job in progress", notice: READY_NOTICE, snapshot });
}
