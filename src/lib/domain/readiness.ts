import { evaluateAlternativeControls, type AltFrameworkInput } from "./alternativeControls";

export type ReadinessGap = {
  code: string;
  message: string;
  nextAction: string;
};

export type PresentExposureState = {
  id: string;
  label: string;
  hasVerifiedDirectControl: boolean;
  selectedUnverifiedDirectControl: boolean;
  controlNoLongerEffective: boolean;
  missingOwner: boolean;
  notUsed: boolean;
  alternative: AltFrameworkInput;
};

export type ReadinessInput = {
  workIdentified: boolean;
  eeiTasksConfirmed: boolean;
  conditionsReviewed: boolean;
  highEnergyReviewed: boolean;
  sifReviewed: boolean;
  briefingSubjects: {
    hazards: boolean;
    procedures: boolean;
    specialPrecautions: boolean;
    energyControls: boolean;
    ppe: boolean;
    eicIdentified: boolean;
    crewIdentified: boolean;
    conditions: boolean;
  };
  crewBriefingComplete: boolean;
  questionsResolved: boolean;
  requiredApprovalsComplete: boolean;
  synchronized: boolean;
  stopWorkActive: boolean;
  presentExposures: PresentExposureState[];
  eicReleaseConfirmations?: {
    briefingBeforeWork: boolean;
    questionsAddressed: boolean;
    changesEntered: boolean;
    controlsReviewed: boolean;
    emergencyRolesReviewed: boolean;
    stopWorkDiscussed: boolean;
    allAcknowledged: boolean;
  };
};

export type FinalStatus =
  | "Ready for Work"
  | "Needs Attention"
  | "Supervisor Review Required"
  | "Stop and Reassess"
  | "Stop Work Active";

export type ReadinessResult = {
  readyForWork: boolean;
  canRelease: boolean;
  status: FinalStatus;
  gaps: ReadinessGap[];
  banner: string | null;
};

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const gaps: ReadinessGap[] = [];

  if (input.stopWorkActive) {
    return {
      readyForWork: false,
      canRelease: false,
      status: "Stop Work Active",
      gaps: [
        {
          code: "stop_work",
          message: "Stop Work is active. Reassess and rebrief before work continues.",
          nextAction: "Stop and reassess the work",
        },
      ],
      banner: "We identified High Energy, but the control plan is not complete.",
    };
  }

  if (!input.workIdentified) {
    gaps.push({ code: "work", message: "Work is not identified.", nextAction: "Describe the work" });
  }
  if (!input.eeiTasksConfirmed) {
    gaps.push({
      code: "tasks",
      message: "Confirm at least one approved EEI task.",
      nextAction: "Confirm an EEI task",
    });
  }
  if (!input.conditionsReviewed) {
    gaps.push({
      code: "conditions",
      message: "Jobsite conditions have not been reviewed.",
      nextAction: "Review jobsite conditions",
    });
  }
  if (!input.highEnergyReviewed) {
    gaps.push({
      code: "he",
      message: "High Energy has not been reviewed.",
      nextAction: "Review High Energy",
    });
  }

  let supervisorNeeded = false;
  for (const exp of input.presentExposures) {
    if (exp.controlNoLongerEffective) {
      gaps.push({
        code: "control_gone",
        message: `A control for ${exp.label} is no longer in place.`,
        nextAction: "Stop and reassess the work",
      });
    }
    if (exp.missingOwner) {
      gaps.push({
        code: "owner",
        message: `A control for ${exp.label} has no responsible person.`,
        nextAction: "Assign a responsible person",
      });
    }
    if (exp.hasVerifiedDirectControl) continue;
    if (exp.selectedUnverifiedDirectControl && !exp.notUsed) {
      gaps.push({
        code: "unverified_dc",
        message: `A Direct Control for ${exp.label} is selected but not verified.`,
        nextAction: "Verify the selected Direct Control",
      });
      continue;
    }
    if (!exp.notUsed && !exp.hasVerifiedDirectControl) {
      gaps.push({
        code: "need_dc",
        message: `High Energy is Present for ${exp.label} without a verified Direct Control.`,
        nextAction: "Choose a Direct Control from the inventory, or choose No direct control available",
      });
      continue;
    }
    const alt = evaluateAlternativeControls(exp.alternative);
    if (!alt.complete) {
      gaps.push({
        code: "alt_incomplete",
        message: `Alternative Control strategy for ${exp.label} is not complete.`,
        nextAction: alt.nextAction ?? "Complete the Alternative Control strategy",
      });
      if (alt.messages.includes("Supervisor review required") || alt.liveStatus === "Supervisor review required") {
        supervisorNeeded = true;
      }
    }
  }

  const subjects = input.briefingSubjects;
  if (!subjects.hazards) gaps.push({ code: "osha_hazards", message: "Hazards associated with the job are not covered.", nextAction: "Cover hazards" });
  if (!subjects.procedures) gaps.push({ code: "osha_proc", message: "Work procedures involved are not covered.", nextAction: "Cover work procedures" });
  if (!subjects.specialPrecautions) gaps.push({ code: "osha_prec", message: "Special precautions are not covered.", nextAction: "Cover special precautions" });
  if (!subjects.energyControls) gaps.push({ code: "osha_energy", message: "Energy-source controls are not covered.", nextAction: "Cover energy-source controls" });
  if (!subjects.ppe) gaps.push({ code: "osha_ppe", message: "Personal protective equipment requirements are not covered.", nextAction: "Cover PPE" });
  if (!subjects.eicIdentified) gaps.push({ code: "eic", message: "Employee in Charge is not identified.", nextAction: "Identify the Employee in Charge" });
  if (!subjects.crewIdentified) gaps.push({ code: "crew", message: "Affected crew is not identified.", nextAction: "Identify the crew" });
  if (!subjects.conditions) gaps.push({ code: "cond2", message: "Existing field conditions are not reviewed.", nextAction: "Review conditions" });

  if (!input.crewBriefingComplete) {
    gaps.push({ code: "brief", message: "Crew briefing is not complete.", nextAction: "Brief the crew" });
  }
  if (!input.questionsResolved) {
    gaps.push({
      code: "questions",
      message: "An identified safety concern remains unresolved.",
      nextAction: "Address crew questions",
    });
  }
  if (!input.requiredApprovalsComplete) {
    gaps.push({
      code: "approvals",
      message: "Required approvals are not complete.",
      nextAction: "Complete supervisor review",
    });
    supervisorNeeded = true;
  }
  if (!input.synchronized) {
    gaps.push({
      code: "sync",
      message: "Required records are not synchronized.",
      nextAction: "Wait until the brief is synchronized",
    });
  }

  const eic = input.eicReleaseConfirmations;
  if (eic) {
    if (!eic.allAcknowledged) {
      gaps.push({
        code: "ack",
        message: "Every affected crew member must acknowledge the current version.",
        nextAction: "Collect acknowledgments",
      });
    }
  }

  const unique = gaps.filter((g, i, arr) => arr.findIndex((x) => x.code === g.code && x.message === g.message) === i);
  const hasPresentHe = input.presentExposures.length > 0;
  const controlIncomplete = unique.some((g) =>
    ["unverified_dc", "need_dc", "alt_incomplete", "owner", "control_gone"].includes(g.code),
  );

  let status: FinalStatus = "Ready for Work";
  if (unique.length) status = supervisorNeeded ? "Supervisor Review Required" : "Needs Attention";
  if (unique.some((g) => g.code === "control_gone" || g.nextAction.includes("reassess"))) status = "Stop and Reassess";

  const readyForWork = unique.length === 0;
  const banner = hasPresentHe && controlIncomplete ? "We identified High Energy, but the control plan is not complete." : null;

  return {
    readyForWork,
    canRelease: readyForWork,
    status: readyForWork ? "Ready for Work" : status,
    gaps: unique,
    banner,
  };
}

export const READY_NOTICE =
  "The briefing is complete. This job is now in progress. When the work is done, finish the post-job review — that is how it becomes Completed.";

export const PLANNING_NOTICE =
  "This application supports job planning and documentation. Follow applicable regulations, approved work methods, switching and clearance procedures, Safe Work Practices, qualified-person requirements, and stop-work authority.";
