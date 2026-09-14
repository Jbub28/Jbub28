import { NextRequest, NextResponse } from "next/server";
import { JrbStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canWriteJrb } from "@/lib/auth/rbac";
import { canMutateJrb } from "@/lib/auth/jrbAccess";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/server/audit";
import { jsonError, originAllowed } from "@/lib/server/http";
import { persistEventConversation } from "@/lib/conversation/persistBriefing";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canWriteJrb(user.roles)) return jsonError("You cannot start a rebrief.", 403);
  const { id } = await context.params;
  const body = await request.json();
  if (!body.reason) return jsonError("Choose why conditions changed.", 400);
  const jrb = await prisma.jrbRecord.findUnique({ where: { id } });
  if (!jrb || !(await canMutateJrb(user, jrb))) return jsonError("Job brief not found.", 404);
  const current = await prisma.jrbVersion.findFirst({ where: { jrbId: id }, orderBy: { versionNumber: "desc" } });
  if (!current) return jsonError("No version.", 400);

  const nextNumber = current.versionNumber + 1;
  const created = await prisma.jrbVersion.create({
    data: {
      jrbId: id,
      versionNumber: nextNumber,
      status: JrbStatus.rebrief_required,
      workDescriptionOriginal: current.workDescriptionOriginal,
      workDescriptionEdited: current.workDescriptionEdited,
      briefingTranscript: current.briefingTranscript,
      transcriptStatus: current.transcriptStatus,
      speechProvider: current.speechProvider,
      controlledLibrarySnapshot: current.controlledLibrarySnapshot ?? undefined,
    },
  });

  const tasks = await prisma.jrbTaskSelection.findMany({ where: { versionId: current.id } });
  const steps = await prisma.jrbJobStep.findMany({ where: { versionId: current.id } });
  const crew = await prisma.jrbCrewMember.findMany({ where: { versionId: current.id } });
  const conditions = await prisma.jrbCondition.findMany({ where: { versionId: current.id } });
  const env = await prisma.jrbEnvironmentalCondition.findMany({ where: { versionId: current.id } });
  const pre = await prisma.jrbPredepartureCheck.findMany({ where: { versionId: current.id } });
  const walk = await prisma.jrbJobsiteWalkdown.findMany({ where: { versionId: current.id } });
  for (const t of tasks) {
    await prisma.jrbTaskSelection.create({
      data: { versionId: created.id, taskId: t.taskId, taskVersionId: t.taskVersionId, confirmed: false },
    });
  }
  for (const s of steps) {
    const { id: _id, versionId: _v, ...rest } = s;
    await prisma.jrbJobStep.create({ data: { ...rest, versionId: created.id } });
  }
  for (const m of crew) {
    const { id: _id, versionId: _v, ...rest } = m;
    await prisma.jrbCrewMember.create({ data: { ...rest, versionId: created.id } });
  }
  for (const c of conditions) {
    const { id: _id, versionId: _v, ...rest } = c;
    await prisma.jrbCondition.create({ data: { ...rest, versionId: created.id } });
  }
  for (const c of env) {
    const { id: _id, versionId: _v, ...rest } = c;
    await prisma.jrbEnvironmentalCondition.create({ data: { ...rest, versionId: created.id } });
  }
  for (const c of pre) {
    const { id: _id, versionId: _v, ...rest } = c;
    await prisma.jrbPredepartureCheck.create({ data: { ...rest, versionId: created.id } });
  }
  for (const c of walk) {
    const { id: _id, versionId: _v, ...rest } = c;
    await prisma.jrbJobsiteWalkdown.create({ data: { ...rest, versionId: created.id } });
  }

  await persistEventConversation({
    jrbId: id,
    versionId: created.id,
    userId: user.id,
    kind: "rebrief",
    transcript: String(body.transcript ?? body.explanation ?? ""),
    facts: [
      { category: "rebrief", key: "reason", label: "What changed", value: String(body.reason), sourceSegment: String(body.transcript ?? "") },
      { category: "rebrief", key: "explanation", label: "Change description", value: String(body.explanation ?? ""), sourceSegment: String(body.transcript ?? "") },
    ],
  });
  await prisma.rebriefEvent.create({
    data: {
      jrbId: id,
      reason: body.reason,
      explanation: body.explanation,
      fromVersion: current.versionNumber,
      toVersion: nextNumber,
      userId: user.id,
      transcript: body.transcript ?? null,
      delta: body.delta ?? undefined,
    },
  });
  await prisma.jrbRecord.update({
    where: { id },
    data: { status: JrbStatus.rebrief_required, currentVersionId: created.id, syncStatus: "synchronized" },
  });
  await writeAudit({
    userId: user.id,
    action: "rebrief",
    entityType: "rebrief_event",
    entityId: id,
    originalValue: { version: current.versionNumber },
    newValue: { version: nextNumber, reason: body.reason },
  });
  return NextResponse.json({
    priorVersion: current.versionNumber,
    newVersion: nextNumber,
    notice: "Ready for Work is paused. Review highlighted items and brief the crew on this version.",
  });
}
