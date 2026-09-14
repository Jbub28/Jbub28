import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canSupervisorReview } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { jsonError, originAllowed } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";
import { CSRA_MAX_SCORE, CSRA_SCORECARD_ITEMS, csraWeightedScore } from "@/lib/domain/csraScorecard";
import { briefTitle, plainStatus } from "@/lib/domain/briefPresentation";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canSupervisorReview(user.roles)) return jsonError("Not allowed.", 403);
  const { id } = await context.params;
  const jrb = await prisma.jrbRecord.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      workType: true,
      employeeInCharge: { select: { displayName: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { workDescriptionEdited: true, workDescriptionOriginal: true } },
      qualityAssessments: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!jrb) return jsonError("Job brief not found.", 404);
  return NextResponse.json({
    jrb: {
      id: jrb.id,
      jrbNumber: jrb.jrbNumber,
      title: briefTitle(jrb),
      status: jrb.status,
      plainStatus: plainStatus(jrb.status),
      jobLocation: jrb.jobLocation,
      employeeInCharge: jrb.employeeInCharge,
    },
    items: CSRA_SCORECARD_ITEMS,
    maxScore: CSRA_MAX_SCORE,
    latest: jrb.qualityAssessments[0] ?? null,
    history: jrb.qualityAssessments,
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canSupervisorReview(user.roles)) return jsonError("Not allowed.", 403);
  const { id } = await context.params;
  const jrb = await prisma.jrbRecord.findFirst({ where: { id, organizationId: user.organizationId } });
  if (!jrb) return jsonError("Job brief not found.", 404);
  const body = await request.json().catch(() => ({}));
  const answers = (body.answers ?? {}) as Record<string, boolean | null>;
  for (const item of CSRA_SCORECARD_ITEMS) {
    if (answers[String(item.number)] !== true && answers[String(item.number)] !== false) {
      return jsonError(`Mark statement ${item.number} true or false.`, 400);
    }
  }
  const totalWeightedScore = csraWeightedScore(answers);
  const created = await prisma.jrbQualityAssessment.create({
    data: {
      jrbId: id,
      observerUserId: user.id,
      observerName: user.displayName,
      observerRole: user.roles.join(","),
      answers,
      totalWeightedScore,
      maxScore: CSRA_MAX_SCORE,
      notes: typeof body.notes === "string" ? body.notes : null,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "jrb_quality_assessment",
    entityType: "jrb_quality_assessment",
    entityId: created.id,
    newValue: { jrbId: id, totalWeightedScore, maxScore: CSRA_MAX_SCORE },
  });
  return NextResponse.json({ assessment: created });
}
