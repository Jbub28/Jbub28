import { NextRequest, NextResponse } from "next/server";
import { Presence } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canWriteJrb } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/server/audit";
import { jsonError, originAllowed } from "@/lib/server/http";
import { buildReadiness } from "@/lib/server/jrbReadiness";

async function loadJrb(id: string) {
  return prisma.jrbRecord.findUnique({
    where: { id },
    include: {
      workType: true,
      employeeInCharge: true,
      supervisor: true,
      createdBy: true,
      operatingArea: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          taskSelections: { include: { task: { include: { activity: { include: { workType: true } }, versions: true } } } },
          conditions: true,
          environmental: true,
          predeparture: true,
          walkdowns: true,
          crewMembers: true,
          acknowledgments: true,
          questions: true,
          postJobReviews: true,
          jobSteps: { orderBy: { sequence: "asc" } },
          exposures: {
            include: {
              exposure: { include: { icon: true } },
              directControlSelections: { include: { directControl: true, verifications: true } },
              notUsed: true,
              alternativeControls: { include: { category: true } },
            },
          },
        },
      },
      stopWorkEvents: { orderBy: { createdAt: "desc" } },
      rebriefEvents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await context.params;
  const jrb = await loadJrb(id);
  if (!jrb || jrb.organizationId !== user.organizationId) return jsonError("Job brief not found.", 404);
  const version = jrb.versions[0];
  const readiness = version ? await buildReadiness(version.id) : null;
  return NextResponse.json({ jrb, readiness });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!canWriteJrb(user.roles)) return jsonError("You cannot update this job brief.", 403);
  const { id } = await context.params;
  const jrb = await prisma.jrbRecord.findUnique({ where: { id } });
  if (!jrb || jrb.organizationId !== user.organizationId) return jsonError("Job brief not found.", 404);
  const version = await prisma.jrbVersion.findFirst({ where: { jrbId: id }, orderBy: { versionNumber: "desc" } });
  if (!version) return jsonError("No version.", 400);
  const body = await request.json();
  const action = String(body.action ?? "save");
  const original = { status: jrb.status };

  if (action === "saveStart") {
    await prisma.jrbRecord.update({
      where: { id },
      data: {
        workOrderNumber: body.workOrderNumber,
        oasDojmNumber: body.oasDojmNumber,
        projectNumber: body.projectNumber,
        circuitNumber: body.circuitNumber,
        clearanceNumber: body.clearanceNumber,
        hazardNumber: body.hazardNumber,
        sawsNumber: body.sawsNumber,
        locateTicketNumber: body.locateTicketNumber,
        jobLocation: body.jobLocation ?? null,
        streetAddress: body.streetAddress ?? null,
        locationIdentifier: body.locationIdentifier ?? null,
        addressOrCoordinates: body.addressOrCoordinates ?? null,
        workLocation: body.workLocation ?? body.jobLocation ?? null,
        gpsLatitude: body.gpsLatitude ?? null,
        gpsLongitude: body.gpsLongitude ?? null,
        gpsPermissionGranted: Boolean(body.gpsPermissionGranted),
        gpsCapturedAt: body.gpsCapturedAt ? new Date(body.gpsCapturedAt) : null,
        contractorInvolved: Boolean(body.contractorInvolved),
        contractorCompany: body.contractorCompany,
        emergencyAccess: body.emergencyAccess,
        communicationMethod: body.communicationMethod,
        workClassification: body.workClassification,
        workClassificationConfirmed: Boolean(body.workClassificationConfirmed),
        plannedStartTime: body.plannedStartTime ? new Date(body.plannedStartTime) : null,
        employeeInChargeId: body.employeeInChargeId ?? jrb.employeeInChargeId,
        supervisorId: body.supervisorId ?? jrb.supervisorId,
        workTypeId: body.workTypeId ?? jrb.workTypeId,
        status: "in_progress",
        syncStatus: "synchronized",
      },
    });
  }

  if (action === "saveWork") {
    await prisma.jrbVersion.update({
      where: { id: version.id },
      data: {
        workDescriptionOriginal: body.workDescriptionOriginal ?? version.workDescriptionOriginal,
        workDescriptionEdited: body.workDescriptionEdited,
        transcriptStatus: body.transcriptStatus,
        speechProvider: body.speechProvider,
      },
    });
  }

  if (action === "confirmTask") {
    const task = await prisma.eeiTask.findUnique({
      where: { id: body.taskId },
      include: { versions: { orderBy: { id: "desc" }, take: 1 }, activity: { include: { workType: true } } },
    });
    if (!task || task.contentStatus !== "published") return jsonError("That is not an approved EEI task.", 400);
    const tv = task.versions[0];
    await prisma.jrbTaskSelection.create({
      data: {
        versionId: version.id,
        taskId: task.id,
        taskVersionId: tv?.id ?? "unknown",
        confirmed: true,
        confirmedAt: new Date(),
      },
    });
    await writeAudit({
      userId: user.id,
      action: "task_confirmation",
      entityType: "jrb_task_selection",
      entityId: jrb.id,
      newValue: { task: task.exactName, version: tv?.version },
    });
  }

  if (action === "saveConditions") {
    if (body.planMatchesField !== undefined) {
      await prisma.jrbCondition.deleteMany({ where: { versionId: version.id } });
      await prisma.jrbCondition.create({
        data: {
          versionId: version.id,
          planMatchesField: body.planMatchesField,
          materialDifferenceNotes: body.materialDifferenceNotes,
          confirmedAt: new Date(),
        },
      });
    }
    if (Array.isArray(body.environmental)) {
      await prisma.jrbEnvironmentalCondition.deleteMany({ where: { versionId: version.id } });
      for (const env of body.environmental) {
        await prisma.jrbEnvironmentalCondition.create({
          data: { versionId: version.id, choice: env.choice, otherText: env.otherText },
        });
      }
    }
    if (Array.isArray(body.predeparture)) {
      await prisma.jrbPredepartureCheck.deleteMany({ where: { versionId: version.id } });
      for (const item of body.predeparture) {
        await prisma.jrbPredepartureCheck.create({
          data: { versionId: version.id, itemKey: item.itemKey, labelExact: item.labelExact, discussed: Boolean(item.discussed) },
        });
      }
    }
    if (Array.isArray(body.walkdown)) {
      await prisma.jrbJobsiteWalkdown.deleteMany({ where: { versionId: version.id } });
      for (const item of body.walkdown) {
        await prisma.jrbJobsiteWalkdown.create({
          data: { versionId: version.id, itemKey: item.itemKey, labelExact: item.labelExact, observed: Boolean(item.observed), notes: item.notes },
        });
      }
    }
  }

  if (action === "setExposure") {
    const existing = await prisma.jrbExposure.findFirst({
      where: { versionId: version.id, exposureId: body.exposureId },
    });
    const data = {
      presence: body.presence as Presence,
      energySource: body.energySource,
      unwantedRelease: body.unwantedRelease,
      personsExposed: body.personsExposed,
      sifOutcome: body.sifOutcome,
      relatedTaskId: body.relatedTaskId,
      whenPresent: body.whenPresent,
      crewConfirmed: Boolean(body.crewConfirmed),
      confirmedAt: body.crewConfirmed ? new Date() : null,
    };
    if (existing) await prisma.jrbExposure.update({ where: { id: existing.id }, data });
    else await prisma.jrbExposure.create({ data: { versionId: version.id, exposureId: body.exposureId, ...data } });
    await writeAudit({ userId: user.id, action: "high_energy_selection", entityType: "jrb_exposure", entityId: jrb.id, newValue: data });
  }

  if (action === "selectDirectControl") {
    const exp = await prisma.jrbExposure.findUnique({ where: { id: body.jrbExposureId } });
    if (!exp) return jsonError("Exposure not found.", 404);
    await prisma.jrbDirectControlSelection.create({
      data: {
        jrbExposureId: exp.id,
        directControlId: body.directControlId,
        planned: true,
        personResponsible: body.personResponsible,
      },
    });
    await writeAudit({ userId: user.id, action: "direct_control_selection", entityType: "jrb_direct_control_selection", entityId: jrb.id, newValue: body });
  }

  if (action === "verifyDirectControl") {
    await prisma.directControlVerification.create({
      data: {
        selectionId: body.selectionId,
        method: body.method,
        personResponsible: body.personResponsible,
        verifiedAt: new Date(),
        notes: body.notes,
        status: "verified",
      },
    });
    await prisma.jrbDirectControlSelection.update({
      where: { id: body.selectionId },
      data: { inPlace: true, checked: true, personResponsible: body.personResponsible },
    });
    await writeAudit({ userId: user.id, action: "direct_control_verification", entityType: "direct_control_verification", entityId: jrb.id, newValue: body });
  }

  if (action === "notUseDirectControl") {
    await prisma.directControlNotUsedReason.create({
      data: {
        jrbExposureId: body.jrbExposureId,
        jrbId: jrb.id,
        jrbVersion: version.versionNumber,
        reason: body.reason,
        explanation: body.explanation,
        userId: user.id,
        eeiTaskId: body.eeiTaskId,
      },
    });
    await writeAudit({ userId: user.id, action: "direct_control_not_used", entityType: "direct_control_not_used_reason", entityId: jrb.id, newValue: body });
  }

  if (action === "saveAlternativeControls") {
    await prisma.jrbAlternativeControl.deleteMany({ where: { jrbExposureId: body.jrbExposureId } });
    for (const c of body.controls ?? []) {
      await prisma.jrbAlternativeControl.create({
        data: {
          jrbExposureId: body.jrbExposureId,
          categoryId: c.categoryId,
          catalogControlId: c.catalogControlId,
          isOther: Boolean(c.isOther),
          description: c.description,
          howReducesExposure: c.howReducesExposure,
          howComplements: c.howComplements,
          owner: c.owner,
          verificationMethod: c.verificationMethod,
          keepInPlaceMethod: c.keepInPlaceMethod,
          endTimeOrRemoval: c.endTimeOrRemoval,
          residualExposure: body.residualExposure,
          stopWorkTrigger: body.stopWorkTrigger,
          supervisorReviewed: Boolean(body.supervisorReviewed),
          supervisorDecision: body.supervisorDecision,
          proposedForLibrary: Boolean(c.isOther),
        },
      });
    }
    if (body.supervisorReviewed) {
      await writeAudit({ userId: user.id, action: "supervisor_review", entityType: "jrb_alternative_controls", entityId: jrb.id });
    }
    await writeAudit({ userId: user.id, action: "alternative_control_selection", entityType: "jrb_alternative_controls", entityId: jrb.id, newValue: body });
  }

  if (action === "saveJobSteps") {
    await prisma.jrbJobStep.deleteMany({ where: { versionId: version.id } });
    for (const step of body.steps ?? []) {
      await prisma.jrbJobStep.create({
        data: {
          versionId: version.id,
          sequence: step.sequence,
          phase: step.phase,
          description: step.description,
          relatedTaskId: step.relatedTaskId,
          workProcedure: step.workProcedure,
          hazardOrExposure: step.hazardOrExposure,
          specialPrecaution: step.specialPrecaution,
          energySourceControl: step.energySourceControl,
          ppeNotes: step.ppeNotes,
          responsiblePerson: step.responsiblePerson,
          stopWorkTrigger: step.stopWorkTrigger,
          sifPotential: step.sifPotential,
        },
      });
    }
  }

  if (action === "saveCrew") {
    await prisma.jrbCrewMember.deleteMany({ where: { versionId: version.id } });
    for (const member of body.crewMembers ?? []) {
      await prisma.jrbCrewMember.create({
        data: {
          versionId: version.id,
          name: member.name,
          employeeOrContractorId: member.employeeOrContractorId,
          employer: member.employer,
          isContractor: Boolean(member.isContractor),
          lateArrival: Boolean(member.lateArrival),
        },
      });
    }
  }

  if (action === "addQuestion") {
    await prisma.jrbQuestion.create({
      data: {
        versionId: version.id,
        question: body.question,
        raisedBy: body.raisedBy,
        eicResponse: body.eicResponse,
        planChanged: Boolean(body.planChanged),
        resolved: Boolean(body.resolved),
      },
    });
  }

  if (action === "acknowledge") {
    await prisma.jrbAcknowledgment.create({
      data: {
        versionId: version.id,
        name: body.name,
        employeeOrContractorId: body.employeeOrContractorId,
        employer: body.employer,
        acknowledgmentText:
          body.acknowledgmentText ??
          "I participated in the briefing, had a chance to ask questions, and understand my part of the job.",
        method: body.method ?? "typed",
        openConcern: Boolean(body.openConcern),
        jrbVersionAcknowledged: version.versionNumber,
      },
    });
    await writeAudit({ userId: user.id, action: "crew_acknowledgment", entityType: "jrb_acknowledgment", entityId: jrb.id, newValue: { name: body.name, version: version.versionNumber } });
  }

  if (action === "saveCloseout") {
    await prisma.jrbPostJobReview.deleteMany({ where: { versionId: version.id } });
    await prisma.jrbPostJobReview.create({
      data: { versionId: version.id, ...body.review, completedAt: new Date() },
    });
    await prisma.jrbRecord.update({ where: { id }, data: { status: "closed" } });
    await writeAudit({ userId: user.id, action: "post_job_closeout", entityType: "jrb_post_job_review", entityId: jrb.id });
  }

  await writeAudit({
    userId: user.id,
    action: "jrb_modification",
    entityType: "jrb_record",
    entityId: jrb.id,
    originalValue: original,
    newValue: { action },
  });

  const updated = await loadJrb(id);
  const current = updated?.versions[0];
  const readiness = current ? await buildReadiness(current.id) : null;
  return NextResponse.json({ jrb: updated, readiness });
}
