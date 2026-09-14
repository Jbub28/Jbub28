import { Presence } from "@prisma/client";
import { plainStatus } from "./briefPresentation";

export type AttentionBand = "urgent" | "watch" | "steady";

export type SupervisorAttention = {
  score: number;
  band: AttentionBand;
  reasons: string[];
  highEnergyCount: number;
  directControlNotUsedCount: number;
  missingAckCount: number;
};

type AttentionInput = {
  status?: string | null;
  jobLocation?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  versions?: {
    crewMembers?: { name: string }[];
    acknowledgments?: { name: string; jrbVersionAcknowledged?: number | null }[];
    versionNumber?: number;
    exposures?: {
      presence?: string | null;
      crewConfirmed?: boolean | null;
      notUsed?: unknown[];
      directControlSelections?: unknown[];
    }[];
  }[];
  stopWorkEvents?: { resumedAt?: Date | string | null }[];
};

export function supervisorAttention(jrb: AttentionInput): SupervisorAttention {
  const reasons: string[] = [];
  let score = 0;
  const version = jrb.versions?.[0];
  const exposures = version?.exposures ?? [];
  const present = exposures.filter((e) => e.presence === Presence.present || e.presence === "present");
  const highEnergyCount = present.length;
  const directControlNotUsedCount = present.filter((e) => (e.notUsed?.length ?? 0) > 0).length;
  const missingControls = present.filter(
    (e) => (e.directControlSelections?.length ?? 0) === 0 && (e.notUsed?.length ?? 0) === 0,
  ).length;
  const crew = version?.crewMembers ?? [];
  const acks = version?.acknowledgments ?? [];
  const versionNumber = version?.versionNumber;
  const missingAckCount = crew.filter(
    (m) => !acks.some((a) => a.name === m.name && (versionNumber == null || a.jrbVersionAcknowledged === versionNumber)),
  ).length;

  if (jrb.status === "stop_work_active") {
    score += 1000;
    reasons.push("Stop Work is active — look here first.");
  }
  if (jrb.status === "rebrief_required") {
    score += 800;
    reasons.push("The crew needs a new briefing.");
  }
  if (jrb.status === "needs_attention") {
    score += 200;
    reasons.push("The brief is marked needs attention.");
  }

  if (highEnergyCount) {
    score += highEnergyCount * 40;
    reasons.push(
      highEnergyCount === 1
        ? "1 High Energy hazard is on this job."
        : `${highEnergyCount} High Energy hazards are on this job.`,
    );
  }
  if (directControlNotUsedCount) {
    score += directControlNotUsedCount * 80;
    reasons.push(
      directControlNotUsedCount === 1
        ? "A Direct Control is marked not used."
        : `${directControlNotUsedCount} Direct Controls are marked not used.`,
    );
  }
  if (missingControls) {
    score += missingControls * 55;
    reasons.push(
      missingControls === 1
        ? "A High Energy hazard has no Direct Control chosen yet."
        : `${missingControls} High Energy hazards have no Direct Control chosen yet.`,
    );
  }
  if (missingAckCount) {
    score += missingAckCount * 25;
    reasons.push(
      missingAckCount === 1 ? "1 crew member still needs to acknowledge." : `${missingAckCount} crew members still need to acknowledge.`,
    );
  }
  if (!jrb.jobLocation?.trim()) {
    score += 15;
    reasons.push("No job address yet.");
  }
  if (jrb.gpsLatitude == null || jrb.gpsLongitude == null) {
    score += 8;
  }

  const openStop = (jrb.stopWorkEvents ?? []).some((e) => !e.resumedAt);
  if (openStop && jrb.status !== "stop_work_active") {
    score += 400;
    reasons.push("A Stop Work event is still open.");
  }

  if (!reasons.length) {
    reasons.push(`Status: ${plainStatus(jrb.status)}. No extra flags.`);
  }

  const band: AttentionBand = score >= 700 ? "urgent" : score >= 80 ? "watch" : "steady";
  return {
    score,
    band,
    reasons,
    highEnergyCount,
    directControlNotUsedCount,
    missingAckCount,
  };
}

export function attentionBandLabel(band: AttentionBand): string {
  if (band === "urgent") return "Look here first";
  if (band === "watch") return "Check soon";
  return "On track";
}
