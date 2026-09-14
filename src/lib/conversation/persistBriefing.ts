import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { BriefingExtraction } from "./types";

export async function persistExtractedLocation(
  jrb: {
    id: string;
    jobLocation: string | null;
    streetAddress: string | null;
    locationIdentifier: string | null;
    circuitNumber: string | null;
    workOrderNumber: string | null;
  },
  extraction: BriefingExtraction,
) {
  const data: Prisma.JrbRecordUpdateInput = {};
  if (extraction.location.jobLocation && !jrb.jobLocation) {
    data.jobLocation = extraction.location.jobLocation;
    data.workLocation = extraction.location.jobLocation;
  }
  if (extraction.location.streetAddress && !jrb.streetAddress) {
    data.streetAddress = extraction.location.streetAddress;
  }
  if (extraction.location.locationIdentifier && !jrb.locationIdentifier) {
    data.locationIdentifier = extraction.location.locationIdentifier;
  }
  if (extraction.location.circuitNumber && !jrb.circuitNumber) {
    data.circuitNumber = extraction.location.circuitNumber;
  }
  if (extraction.location.workOrderNumber && !jrb.workOrderNumber) {
    data.workOrderNumber = extraction.location.workOrderNumber;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.jrbRecord.update({ where: { id: jrb.id }, data });
}

export async function persistBriefingConversation(input: {
  jrbId: string;
  versionId: string;
  userId: string;
  extraction: BriefingExtraction;
  kind?: string;
}) {
  const session = await prisma.conversationSession.create({
    data: {
      jrbId: input.jrbId,
      versionId: input.versionId,
      kind: input.kind ?? "briefing",
      transcript: input.extraction.transcript,
      provider: input.extraction.provider,
      model: input.extraction.model,
      audioDiscarded: true,
      userId: input.userId,
      facts: {
        create: input.extraction.facts.map((f) => ({
          jrbId: input.jrbId,
          versionId: input.versionId,
          category: f.category,
          key: f.key,
          label: f.label,
          value: f.value as Prisma.InputJsonValue,
          sourceSegment: f.sourceSegment,
          confidence: f.confidence,
          origin: f.origin,
          displayOnJrb: f.displayOnJrb,
          catalogId: f.catalogId ?? null,
        })),
      },
    },
  });

  await prisma.briefingAssessment.upsert({
    where: { versionId: input.versionId },
    update: {
      hazardsAddressed: input.extraction.osha.hazardsAddressed,
      proceduresAddressed: input.extraction.osha.proceduresAddressed,
      precautionsAddressed: input.extraction.osha.precautionsAddressed,
      energyControlsAddressed: input.extraction.osha.energyControlsAddressed,
      ppeAddressed: input.extraction.osha.ppeAddressed,
      evidence: input.extraction.osha.evidence as Prisma.InputJsonValue,
      followUps: input.extraction.followUps as unknown as Prisma.InputJsonValue,
    },
    create: {
      versionId: input.versionId,
      hazardsAddressed: input.extraction.osha.hazardsAddressed,
      proceduresAddressed: input.extraction.osha.proceduresAddressed,
      precautionsAddressed: input.extraction.osha.precautionsAddressed,
      energyControlsAddressed: input.extraction.osha.energyControlsAddressed,
      ppeAddressed: input.extraction.osha.ppeAddressed,
      evidence: input.extraction.osha.evidence as Prisma.InputJsonValue,
      followUps: input.extraction.followUps as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.jrbVersion.update({
    where: { id: input.versionId },
    data: {
      briefingTranscript: input.extraction.transcript,
      workDescriptionOriginal: input.extraction.transcript,
      workDescriptionEdited: input.extraction.workDescription ?? undefined,
      transcriptStatus: "ok",
      speechProvider: "browser",
    },
  });

  for (const env of input.extraction.facts.filter((f) => f.category === "environment")) {
    const choice = String(env.value);
    const exists = await prisma.jrbEnvironmentalCondition.findFirst({
      where: { versionId: input.versionId, choice },
    });
    if (!exists) {
      await prisma.jrbEnvironmentalCondition.create({
        data: { versionId: input.versionId, choice, otherText: env.sourceSegment },
      });
    }
  }

  return session;
}

export async function persistEventConversation(input: {
  jrbId: string;
  versionId?: string | null;
  userId: string;
  kind: string;
  transcript: string;
  facts: Array<{
    category: string;
    key: string;
    label: string;
    value: Prisma.InputJsonValue;
    sourceSegment?: string;
    origin?: string;
  }>;
}) {
  return prisma.conversationSession.create({
    data: {
      jrbId: input.jrbId,
      versionId: input.versionId,
      kind: input.kind,
      transcript: input.transcript,
      provider: "browser",
      model: input.kind,
      audioDiscarded: true,
      userId: input.userId,
      facts: {
        create: input.facts.map((f) => ({
          jrbId: input.jrbId,
          versionId: input.versionId,
          category: f.category,
          key: f.key,
          label: f.label,
          value: f.value,
          sourceSegment: f.sourceSegment,
          confidence: "high",
          origin: f.origin ?? "employee_entered",
          displayOnJrb: true,
        })),
      },
    },
  });
}
