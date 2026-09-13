export const DIRECT_CONTROL_NOT_USED_REASONS = [
  "Not Available",
  "Administrative Control Only",
  "Does Not Specifically Target the High Energy Source",
  "Does Not Effectively Mitigate Exposure When Installed, Verified, and Used Properly",
  "Does Not Protect Against Unintentional Human Error During the Work",
  "Other",
] as const;

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
