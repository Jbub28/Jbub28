export const DIRECT_CONTROL_NOT_USED_REASONS = [
  "Not Available",
  "Administrative Control Only",
  "Does Not Specifically Target the High Energy Source",
  "Does Not Effectively Mitigate Exposure When Installed, Verified, and Used Properly",
  "Does Not Protect Against Unintentional Human Error During the Work",
  "Other",
] as const;

export const NO_DIRECT_CONTROL_AVAILABLE = "__no_direct_control_available__";
export const NO_DIRECT_CONTROL_AVAILABLE_LABEL = "No direct control available";

export type DirectControlChoice = {
  exposureId: string;
  exposureLabel: string;
  selectedDirectControlId?: string | null;
  notUsedRecorded: boolean;
};

export function isNoDirectControlAvailable(id?: string | null) {
  return id === NO_DIRECT_CONTROL_AVAILABLE;
}

export function isInventoryDirectControlId(id?: string | null) {
  return Boolean(id) && !isNoDirectControlAvailable(id);
}

export function missingDirectControlChoice(choices: DirectControlChoice[]): string | null {
  for (const choice of choices) {
    const selected = choice.selectedDirectControlId;
    if (isInventoryDirectControlId(selected)) continue;
    if (isNoDirectControlAvailable(selected) || choice.notUsedRecorded) {
      if (!choice.notUsedRecorded) {
        return `No Direct Control is available for ${choice.exposureLabel}. Select Alternative Controls before you continue.`;
      }
      continue;
    }
    return `Choose a Direct Control from the inventory for ${choice.exposureLabel}, or choose No direct control available.`;
  }
  return null;
}

export const REBRIEF_REASONS = [
  "Work scope changed",
  "Task changed",
  "Work method changed",
  "Crew changed",
  "Equipment changed",
  "System configuration changed",
  "Weather changed",
  "Location changed",
  "New hazard identified",
  "New High Energy exposure identified",
  "Direct Control failed",
  "Direct Control became unavailable",
  "Alternative Control changed",
  "Emergency or unplanned condition",
  "Other",
] as const;

export const VERIFICATION_METHODS = [
  "Visual verification",
  "Functional test",
  "Physical installation confirmed",
  "Isolation confirmed",
  "Zero-energy state confirmed",
  "Grounding confirmed",
  "Minimum approach distance confirmed",
  "Exclusion zone confirmed",
  "Qualified-person confirmation",
  "Photo attached",
  "Other approved method",
] as const;

export const WORK_TYPES = [
  { code: "ELECTRIC_DISTRIBUTION", exactName: "Electric Distribution" },
  { code: "ELECTRIC_TRANSMISSION", exactName: "Electric Transmission" },
  { code: "ELECTRIC_SUBSTATION", exactName: "Electric Substation" },
] as const;

export const WORK_CLASSIFICATIONS = [
  { value: "operations_or_maintenance", label: "Operations or Maintenance" },
  { value: "construction", label: "Construction" },
  { value: "not_yet_determined", label: "Not Yet Determined" },
] as const;

export function isVerifiedDirectControl(sel: {
  noLongerEffective?: boolean;
  verifications: { status: string }[];
}): boolean {
  if (sel.noLongerEffective) return false;
  return sel.verifications.some((v) => v.status === "verified");
}
