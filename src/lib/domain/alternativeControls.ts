export const ALT_CATEGORIES = ["Physical Obstacle", "Dedicated Monitoring", "Visual Reminder"] as const;
export type AltCategory = (typeof ALT_CATEGORIES)[number];

export type AlternativeControlInput = {
  category: string;
  owner?: string | null;
  verificationMethod?: string | null;
  isOther?: boolean;
  description?: string | null;
  howReducesExposure?: string | null;
  howComplements?: string | null;
};

export type AltFrameworkInput = {
  controls: AlternativeControlInput[];
  residualExposure?: string | null;
  stopWorkTrigger?: string | null;
  supervisorReviewed?: boolean;
  notUsedReasonRecorded?: boolean;
};

export type AltValidation = {
  complete: boolean;
  messages: string[];
  liveStatus: string;
  nextAction: string | null;
};

export function evaluateAlternativeControls(input: AltFrameworkInput): AltValidation {
  const messages: string[] = [];
  const controls = input.controls;
  const count = controls.length;
  let liveStatus =
    count === 0 ? "0 of 2 controls selected" : count === 1 ? "1 of 2 controls selected" : `${count} controls selected`;

  if (count < 2) {
    messages.push("Select at least two Alternative Controls.");
  }

  const categories = new Set(controls.map((c) => c.category).filter((c) => ALT_CATEGORIES.includes(c as AltCategory)));
  if (count >= 2 && categories.size < 2) {
    messages.push("Choose a control from another category");
    liveStatus = "Choose a control from another category";
  }

  for (const c of controls) {
    if (!c.owner?.trim()) messages.push("Assign a responsible person.");
    if (!c.verificationMethod?.trim()) messages.push("Choose a verification method for each control.");
    if (c.isOther) {
      if (!c.description?.trim()) messages.push("Describe the Other control.");
      if (!c.howReducesExposure?.trim()) messages.push("Explain how the Other control reduces the exposure.");
      if (!c.howComplements?.trim()) messages.push("Explain how the Other control complements the other control.");
    }
  }

  if (!input.notUsedReasonRecorded) {
    messages.push("Record why a Direct Control is not being used.");
  }
  if (!input.residualExposure?.trim()) {
    messages.push("Document the remaining exposure.");
  }
  if (!input.stopWorkTrigger?.trim()) {
    messages.push("Record stop-work conditions.");
  }
  if (!input.supervisorReviewed) {
    messages.push("Supervisor review required");
    if (!messages.includes("Supervisor review required")) {
      /* uniqueness below */
    }
  }

  const unique = [...new Set(messages)];
  const complete =
    count >= 2 &&
    categories.size >= 2 &&
    controls.every((c) => c.owner?.trim() && c.verificationMethod?.trim()) &&
    Boolean(input.notUsedReasonRecorded) &&
    Boolean(input.residualExposure?.trim()) &&
    Boolean(input.stopWorkTrigger?.trim()) &&
    Boolean(input.supervisorReviewed) &&
    controls.every((c) =>
      c.isOther
        ? Boolean(c.description?.trim() && c.howReducesExposure?.trim() && c.howComplements?.trim())
        : true,
    );

  if (complete) liveStatus = "Alternative Control requirement met";
  else if (!input.supervisorReviewed && count >= 2 && categories.size >= 2) {
    liveStatus = "Supervisor review required";
  }

  let nextAction: string | null = null;
  if (count < 2) nextAction = "Choose one more Alternative Control";
  else if (categories.size < 2) nextAction = "Choose an Alternative Control from a second category";
  else if (controls.some((c) => !c.owner?.trim())) nextAction = "Assign a responsible person";
  else if (!input.residualExposure?.trim()) nextAction = "Document the remaining exposure";
  else if (!input.supervisorReviewed) nextAction = "Complete supervisor review";

  return { complete, messages: unique, liveStatus, nextAction };
}
