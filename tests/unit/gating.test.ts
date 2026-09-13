import { describe, expect, it } from "vitest";
import { evaluateAlternativeControls } from "@/lib/domain/alternativeControls";
import { evaluateReadiness } from "@/lib/domain/readiness";
import { canInitiateStopWork, canPublishEei, canReleaseJrb, canWriteJrb } from "@/lib/auth/rbac";
import { RoleName } from "@prisma/client";
import { MockSpeechProvider } from "@/lib/providers/speech";
import { AzureOpenAiProvider } from "@/lib/providers/ai";
import { validateUpload } from "@/lib/providers/storage";

const completeBriefing = {
  hazards: true,
  procedures: true,
  specialPrecautions: true,
  energyControls: true,
  ppe: true,
  eicIdentified: true,
  crewIdentified: true,
  conditions: true,
};

describe("alternative controls", () => {
  it("rejects two controls from the same category", () => {
    const result = evaluateAlternativeControls({
      controls: [
        { category: "Dedicated Monitoring", owner: "A", verificationMethod: "Visual verification" },
        { category: "Dedicated Monitoring", owner: "B", verificationMethod: "Visual verification" },
      ],
      residualExposure: "still present",
      stopWorkTrigger: "if barrier fails",
      supervisorReviewed: true,
      notUsedReasonRecorded: true,
    });
    expect(result.complete).toBe(false);
    expect(result.liveStatus).toBe("Choose a control from another category");
  });

  it("accepts a complete two-category strategy", () => {
    const result = evaluateAlternativeControls({
      controls: [
        { category: "Physical Obstacle", owner: "A", verificationMethod: "Visual verification" },
        { category: "Visual Reminder", owner: "B", verificationMethod: "Photo attached" },
      ],
      residualExposure: "workers could still step toward the line",
      stopWorkTrigger: "if a control is moved",
      supervisorReviewed: true,
      notUsedReasonRecorded: true,
    });
    expect(result.complete).toBe(true);
    expect(result.liveStatus).toBe("Alternative Control requirement met");
  });

  it("requires ownership and supervisor review", () => {
    const result = evaluateAlternativeControls({
      controls: [
        { category: "Physical Obstacle", owner: "", verificationMethod: "Visual verification" },
        { category: "Visual Reminder", owner: "B", verificationMethod: "Visual verification" },
      ],
      residualExposure: "x",
      stopWorkTrigger: "y",
      supervisorReviewed: false,
      notUsedReasonRecorded: true,
    });
    expect(result.complete).toBe(false);
    expect(result.nextAction).toBe("Assign a responsible person");
  });
});

describe("ready for work gating", () => {
  it("blocks unverified Direct Control", () => {
    const result = evaluateReadiness({
      workIdentified: true,
      eeiTasksConfirmed: true,
      conditionsReviewed: true,
      highEnergyReviewed: true,
      sifReviewed: true,
      briefingSubjects: completeBriefing,
      crewBriefingComplete: true,
      questionsResolved: true,
      requiredApprovalsComplete: true,
      synchronized: true,
      stopWorkActive: false,
      presentExposures: [
        {
          id: "1",
          label: "Electrical Contact with Source ≥ 50 Volts",
          hasVerifiedDirectControl: false,
          selectedUnverifiedDirectControl: true,
          controlNoLongerEffective: false,
          missingOwner: false,
          notUsed: false,
          alternative: { controls: [] },
        },
      ],
    });
    expect(result.readyForWork).toBe(false);
    expect(result.gaps.some((g) => g.nextAction === "Verify the selected Direct Control")).toBe(true);
  });

  it("removes Ready for Work on Stop Work without supervisor", () => {
    const result = evaluateReadiness({
      workIdentified: true,
      eeiTasksConfirmed: true,
      conditionsReviewed: true,
      highEnergyReviewed: true,
      sifReviewed: true,
      briefingSubjects: completeBriefing,
      crewBriefingComplete: true,
      questionsResolved: true,
      requiredApprovalsComplete: true,
      synchronized: true,
      stopWorkActive: true,
      presentExposures: [],
    });
    expect(result.status).toBe("Stop Work Active");
    expect(result.readyForWork).toBe(false);
    expect(canInitiateStopWork([RoleName.field_team_member])).toBe(true);
  });

  it("requires synchronization before treating as released", () => {
    const result = evaluateReadiness({
      workIdentified: true,
      eeiTasksConfirmed: true,
      conditionsReviewed: true,
      highEnergyReviewed: true,
      sifReviewed: true,
      briefingSubjects: completeBriefing,
      crewBriefingComplete: true,
      questionsResolved: true,
      requiredApprovalsComplete: true,
      synchronized: false,
      stopWorkActive: false,
      presentExposures: [],
    });
    expect(result.canRelease).toBe(false);
    expect(result.gaps.some((g) => g.code === "sync")).toBe(true);
  });
});

describe("authorization", () => {
  it("stops field users from publishing EEI libraries", () => {
    expect(canWriteJrb([RoleName.field_team_member])).toBe(true);
    expect(canReleaseJrb([RoleName.field_team_member])).toBe(false);
    expect(canReleaseJrb([RoleName.employee_in_charge])).toBe(true);
    expect(canPublishEei([RoleName.field_team_member])).toBe(false);
    expect(canPublishEei([RoleName.eei_task_library_administrator])).toBe(true);
  });
});

describe("providers", () => {
  it("speech mock fails closed with a simple message", async () => {
    const result = await new MockSpeechProvider().transcribe({});
    expect(result.status).toBe("failed");
    expect(result.message).toMatch(/type the work/i);
  });

  it("AI provider does not guess when Azure is missing", async () => {
    const prior = process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    const result = await new AzureOpenAiProvider().matchTasks({
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      text: "setting a pole",
      approvedTasks: [],
      approvedSynonyms: [],
    });
    expect(result.unmatched).toBe(true);
    expect(result.message).toMatch(/select a task/i);
    if (prior) process.env.AZURE_OPENAI_ENDPOINT = prior;
  });

  it("rejects disallowed uploads", () => {
    expect(validateUpload({ mimeType: "application/x-msdownload", sizeBytes: 10 }).ok).toBe(false);
    expect(validateUpload({ mimeType: "image/jpeg", sizeBytes: 100 }).ok).toBe(true);
  });
});
