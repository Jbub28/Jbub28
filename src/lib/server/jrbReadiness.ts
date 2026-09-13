import { ContentStatus, JrbStatus, Presence } from "@prisma/client";
import { prisma } from "@/lib/db";
import { evaluateAlternativeControls } from "@/lib/domain/alternativeControls";
import { isVerifiedDirectControl } from "@/lib/domain/controls";
import { evaluateReadiness, type ReadinessInput, type ReadinessResult } from "@/lib/domain/readiness";

export async function buildReadiness(versionId: string): Promise<ReadinessResult> {
  const version = await prisma.jrbVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      jrb: true,
      taskSelections: true,
      conditions: true,
      crewMembers: true,
      acknowledgments: true,
      questions: true,
      jobSteps: true,
      exposures: {
        include: {
          exposure: true,
          directControlSelections: { include: { verifications: true } },
          notUsed: true,
          alternativeControls: { include: { category: true } },
        },
      },
      approvals: true,
    },
  });

  const present = version.exposures.filter((e) => e.presence === Presence.present);
  const input: ReadinessInput = {
    workIdentified: Boolean(version.workDescriptionEdited || version.taskSelections.some((t) => t.confirmed)),
    eeiTasksConfirmed: version.taskSelections.some((t) => t.confirmed),
    conditionsReviewed: version.conditions.some((c) => c.planMatchesField !== null),
    highEnergyReviewed: version.exposures.length > 0,
    sifReviewed: present.every((e) => Boolean(e.sifOutcome) || e.crewConfirmed),
    briefingSubjects: {
      hazards: present.length > 0 || version.exposures.some((e) => e.presence !== Presence.need_help),
      procedures: version.jobSteps.some((s) => Boolean(s.workProcedure)),
      specialPrecautions: version.jobSteps.some((s) => Boolean(s.specialPrecaution)),
      energyControls:
        present.length === 0 ||
        present.every(
          (e) =>
            e.directControlSelections.some((s) => isVerifiedDirectControl(s)) ||
            evaluateAlternativeControls({
              controls: e.alternativeControls.map((a) => ({
                category: a.category.exactName,
                owner: a.owner,
                verificationMethod: a.verificationMethod,
                isOther: a.isOther,
                description: a.description,
                howReducesExposure: a.howReducesExposure,
                howComplements: a.howComplements,
              })),
              residualExposure: e.alternativeControls[0]?.residualExposure,
              stopWorkTrigger: e.alternativeControls[0]?.stopWorkTrigger,
              supervisorReviewed: e.alternativeControls.every((a) => a.supervisorReviewed) && e.alternativeControls.length > 0,
              notUsedReasonRecorded: e.notUsed.length > 0,
            }).complete,
        ),
      ppe: version.jobSteps.some((s) => Boolean(s.ppeNotes)),
      eicIdentified: Boolean(version.jrb.employeeInChargeId),
      crewIdentified: version.crewMembers.length > 0,
      conditions: version.conditions.some((c) => c.planMatchesField !== null),
    },
    crewBriefingComplete:
      version.crewMembers.length > 0 &&
      version.crewMembers.every((m) =>
        version.acknowledgments.some((a) => a.name === m.name && a.jrbVersionAcknowledged === version.versionNumber),
      ),
    questionsResolved: version.questions.every((q) => q.resolved),
    requiredApprovalsComplete: present.every((e) => {
      if (e.notUsed.length === 0) return true;
      return e.alternativeControls.length > 0 && e.alternativeControls.every((a) => a.supervisorReviewed);
    }),
    synchronized: version.jrb.syncStatus === "synchronized",
    stopWorkActive: version.jrb.status === JrbStatus.stop_work_active,
    presentExposures: present.map((e) => {
      const verified = e.directControlSelections.some((s) => isVerifiedDirectControl(s));
      const selected = e.directControlSelections.length > 0;
      return {
        id: e.id,
        label: e.exposure.formLabelExact ?? e.exposure.dcInventoryLabelExact ?? e.exposure.key,
        hasVerifiedDirectControl: verified,
        selectedUnverifiedDirectControl: selected && !verified,
        controlNoLongerEffective: e.directControlSelections.some((s) => s.noLongerEffective),
        missingOwner:
          e.directControlSelections.some((s) => !s.personResponsible) ||
          e.alternativeControls.some((a) => !a.owner),
        notUsed: e.notUsed.length > 0,
        alternative: {
          controls: e.alternativeControls.map((a) => ({
            category: a.category.exactName,
            owner: a.owner,
            verificationMethod: a.verificationMethod,
            isOther: a.isOther,
            description: a.description,
            howReducesExposure: a.howReducesExposure,
            howComplements: a.howComplements,
          })),
          residualExposure: e.alternativeControls[0]?.residualExposure,
          stopWorkTrigger: e.alternativeControls[0]?.stopWorkTrigger,
          supervisorReviewed: e.alternativeControls.length > 0 && e.alternativeControls.every((a) => a.supervisorReviewed),
          notUsedReasonRecorded: e.notUsed.length > 0,
        },
      };
    }),
    eicReleaseConfirmations: {
      briefingBeforeWork: true,
      questionsAddressed: version.questions.every((q) => q.resolved),
      changesEntered: true,
      controlsReviewed: true,
      emergencyRolesReviewed: true,
      stopWorkDiscussed: true,
      allAcknowledged:
        version.crewMembers.length > 0 &&
        version.crewMembers.every((m) =>
          version.acknowledgments.some((a) => a.name === m.name && a.jrbVersionAcknowledged === version.versionNumber),
        ),
    },
  };

  return evaluateReadiness(input);
}

export async function snapshotLibraries() {
  const [tasks, exposures, dcs] = await Promise.all([
    prisma.eeiTaskVersion.findMany({ take: 5000, orderBy: { id: "desc" } }),
    prisma.highEnergyExposure.findMany({ where: { contentStatus: ContentStatus.published } }),
    prisma.directControlVersion.findMany({ take: 5000, orderBy: { id: "desc" } }),
  ]);
  return {
    eeiTaskVersionIds: [...new Set(tasks.map((t) => t.id))].slice(0, 400),
    highEnergyIds: exposures.map((e) => e.id),
    directControlVersionIds: [...new Set(dcs.map((d) => d.id))].slice(0, 200),
    capturedAt: new Date().toISOString(),
  };
}
