import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canSupervisorReview } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/server/http";
import { attentionBandLabel, supervisorAttention } from "@/lib/domain/supervisorAttention";
import { briefTitle, plainStatus } from "@/lib/domain/briefPresentation";
import { CSRA_MAX_SCORE } from "@/lib/domain/csraScorecard";

export async function GET() {
  const user = await requireUser();
  if (!canSupervisorReview(user.roles)) return jsonError("Not allowed.", 403);
  const jrbs = await prisma.jrbRecord.findMany({
    where: {
      organizationId: user.organizationId,
      status: { not: "closed" },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      workType: true,
      employeeInCharge: { select: { displayName: true } },
      qualityAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      stopWorkEvents: { orderBy: { createdAt: "desc" }, take: 3 },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          crewMembers: true,
          acknowledgments: true,
          exposures: { include: { notUsed: true, directControlSelections: true } },
        },
      },
    },
  });
  const rows = jrbs
    .map((j) => {
      const attention = supervisorAttention(j);
      const assessment = j.qualityAssessments[0];
      return {
        id: j.id,
        jrbNumber: j.jrbNumber,
        title: briefTitle(j),
        status: j.status,
        plainStatus: plainStatus(j.status),
        jobLocation: j.jobLocation,
        locationIdentifier: j.locationIdentifier,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        date: j.date,
        employeeInCharge: j.employeeInCharge,
        workType: j.workType,
        versions: j.versions.map((v) => ({ releasedAt: v.releasedAt })),
        attention,
        attentionLabel: attentionBandLabel(attention.band),
        qualityScore: assessment ? `${assessment.totalWeightedScore}/${assessment.maxScore || CSRA_MAX_SCORE}` : null,
        assessedAt: assessment?.createdAt ?? null,
      };
    })
    .sort((a, b) => {
      const bandRank = { urgent: 0, watch: 1, steady: 2 };
      if (bandRank[a.attention.band] !== bandRank[b.attention.band]) {
        return bandRank[a.attention.band] - bandRank[b.attention.band];
      }
      return b.attention.score - a.attention.score;
    });
  return NextResponse.json({ jrbs: rows });
}

export async function POST() {
  return jsonError("Use the assessment page to save a scorecard.", 405);
}
