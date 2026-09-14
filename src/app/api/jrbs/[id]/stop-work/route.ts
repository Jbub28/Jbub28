import { NextRequest, NextResponse } from "next/server";
import { JrbStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canInitiateStopWork } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/server/audit";
import { jsonError, originAllowed } from "@/lib/server/http";
import { persistEventConversation } from "@/lib/conversation/persistBriefing";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canInitiateStopWork(user.roles)) return jsonError("You cannot start Stop Work.", 403);
  const { id } = await context.params;
  const body = await request.json();
  if (!body.reason || !body.explanation) return jsonError("Choose a reason and explain what happened.", 400);
  const jrb = await prisma.jrbRecord.findUnique({ where: { id } });
  if (!jrb) return jsonError("Job brief not found.", 404);
  const version = await prisma.jrbVersion.findFirst({ where: { jrbId: id }, orderBy: { versionNumber: "desc" } });
  const transcript = String(body.transcript ?? body.explanation ?? "");
  await persistEventConversation({
    jrbId: id,
    versionId: version?.id,
    userId: user.id,
    kind: "stop_work",
    transcript,
    facts: [
      { category: "stop_work", key: "reason", label: "Stop Work reason", value: String(body.reason), sourceSegment: transcript },
      { category: "stop_work", key: "explanation", label: "What happened", value: String(body.explanation), sourceSegment: transcript },
      ...(body.affectedHazard
        ? [{ category: "stop_work", key: "affectedHazard", label: "Affected hazard", value: String(body.affectedHazard), sourceSegment: transcript }]
        : []),
    ],
  });
  await prisma.stopWorkEvent.create({
    data: {
      jrbId: id,
      reason: body.reason,
      explanation: body.explanation,
      initiatingUserId: user.id,
      relatedTaskOrStep: body.relatedTaskOrStep,
      immediateCondition: body.immediateCondition,
      correctiveAction: body.correctiveAction,
      affectedHazard: body.affectedHazard,
      transcript: body.transcript,
      rebriefOccurred: Boolean(body.rebriefOccurred),
    },
  });
  await prisma.jrbRecord.update({
    where: { id },
    data: { status: JrbStatus.stop_work_active, syncStatus: "synchronized" },
  });
  await writeAudit({
    userId: user.id,
    action: "stop_work",
    entityType: "stop_work_event",
    entityId: id,
    newValue: body,
  });
  return NextResponse.json({
    status: "Stop Work Active",
    notice: "Stop Work is active. Ready for Work is removed. Reassess before work continues.",
  });
}
