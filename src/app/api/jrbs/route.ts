import { NextRequest, NextResponse } from "next/server";
import { JrbStatus, WorkClassification } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canWriteJrb } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { nextJrbNumber, writeAudit } from "@/lib/server/audit";
import { jsonError, originAllowed } from "@/lib/server/http";

export async function GET() {
  const user = await requireUser();
  const jrbs = await prisma.jrbRecord.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 80,
    include: {
      workType: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: {
          workDescriptionEdited: true,
          workDescriptionOriginal: true,
        },
      },
    },
  });
  return NextResponse.json({ jrbs });
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canWriteJrb(user.roles)) return jsonError("You cannot create a job brief.", 403);
  const body = await request.json().catch(() => ({}));
  const workTypeCode = body.workTypeCode as string | undefined;
  const workType = workTypeCode
    ? await prisma.workType.findUnique({ where: { code: workTypeCode } })
    : null;
  const number = await nextJrbNumber();
  const area = await prisma.operatingArea.findFirst({ where: { organizationId: user.organizationId } });
  const jrb = await prisma.jrbRecord.create({
    data: {
      organizationId: user.organizationId,
      jrbNumber: number,
      status: JrbStatus.draft,
      createdById: user.id,
      employeeInChargeId: body.employeeInChargeId ?? user.id,
      supervisorId: body.supervisorId ?? null,
      operatingAreaId: body.operatingAreaId ?? area?.id,
      workTypeId: workType?.id,
      workClassification: (body.workClassification as WorkClassification) ?? WorkClassification.not_yet_determined,
      workOrderNumber: body.workOrderNumber,
      oasDojmNumber: body.oasDojmNumber,
      projectNumber: body.projectNumber,
      circuitNumber: body.circuitNumber,
      clearanceNumber: body.clearanceNumber,
      hazardNumber: body.hazardNumber,
      sawsNumber: body.sawsNumber,
      jobLocation: body.jobLocation ?? null,
      streetAddress: body.streetAddress ?? null,
      locationIdentifier: body.locationIdentifier ?? null,
      addressOrCoordinates: body.addressOrCoordinates ?? null,
      workLocation: body.workLocation ?? body.jobLocation ?? null,
      contractorInvolved: Boolean(body.contractorInvolved),
      contractorCompany: body.contractorCompany,
      emergencyAccess: body.emergencyAccess,
      communicationMethod: body.communicationMethod,
      plannedStartTime: body.plannedStartTime ? new Date(body.plannedStartTime) : null,
      syncStatus: "waiting_to_sync",
    },
  });
  const version = await prisma.jrbVersion.create({
    data: { jrbId: jrb.id, versionNumber: 1, status: JrbStatus.draft },
  });
  await prisma.jrbRecord.update({ where: { id: jrb.id }, data: { currentVersionId: version.id, syncStatus: "synchronized" } });
  if (Array.isArray(body.crewMembers)) {
    for (const member of body.crewMembers) {
      await prisma.jrbCrewMember.create({
        data: {
          versionId: version.id,
          name: member.name,
          employeeOrContractorId: member.employeeOrContractorId,
          employer: member.employer ?? "Electric Delivery",
          isContractor: Boolean(member.isContractor),
        },
      });
    }
  }
  await writeAudit({
    userId: user.id,
    action: "jrb_create",
    entityType: "jrb_record",
    entityId: jrb.id,
    newValue: { jrbNumber: number },
  });
  return NextResponse.json({ id: jrb.id, jrbNumber: number, versionId: version.id });
}
