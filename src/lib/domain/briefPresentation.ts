export const ACTIVE_JOB_STATUSES = [
  "released_for_work",
  "stop_work_active",
  "rebrief_required",
] as const;

export const WRITING_STATUSES = [
  "draft",
  "in_progress",
  "needs_attention",
  "supervisor_review_required",
  "ready_for_crew_briefing",
  "crew_briefing_complete",
  "ready_for_work",
] as const;

export function plainStatus(status?: string | null): string {
  switch (status) {
    case "draft":
    case "in_progress":
      return "Still writing";
    case "needs_attention":
      return "Needs attention";
    case "supervisor_review_required":
      return "Waiting on supervisor";
    case "ready_for_crew_briefing":
    case "crew_briefing_complete":
    case "ready_for_work":
      return "Ready to start";
    case "released_for_work":
      return "Job in progress";
    case "stop_work_active":
      return "Stop work";
    case "rebrief_required":
      return "Needs a new briefing";
    case "closed":
      return "Completed";
    default:
      return status ? status.replaceAll("_", " ") : "Still writing";
  }
}

export function statusTone(status?: string | null): "ok" | "warn" | "neutral" {
  if (status === "closed") return "ok";
  if (status === "released_for_work") return "ok";
  if (status === "stop_work_active" || status === "rebrief_required" || status === "needs_attention") return "warn";
  return "neutral";
}

export function shortWorkName(input: {
  workType?: { exactName?: string | null } | null;
  versions?: { workDescriptionEdited?: string | null; workDescriptionOriginal?: string | null }[];
  workDescription?: string | null;
}): string {
  const version = input.versions?.[0];
  const raw =
    input.workDescription ||
    version?.workDescriptionEdited ||
    version?.workDescriptionOriginal ||
    input.workType?.exactName ||
    "";
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const clause = text.split(/[.!?;]| our job is to /i)[0]?.trim() ?? text;
  const words = clause.split(" ").filter(Boolean).slice(0, 6);
  const label = words.join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortPlaceName(input: {
  jobLocation?: string | null;
  locationIdentifier?: string | null;
}): string {
  const loc = (input.jobLocation || "").replace(/\s+/g, " ").trim();
  if (loc && !/^pole\s/i.test(loc) && !/^structure\s/i.test(loc)) {
    const withoutIn = loc.replace(/\bin\s+/gi, ", ").replace(/\s+,/g, ",").replace(/,,+/g, ",");
    return withoutIn.length > 42 ? `${withoutIn.slice(0, 40).trim()}…` : withoutIn;
  }
  return "";
}

export function briefHasContent(input: {
  jobLocation?: string | null;
  locationIdentifier?: string | null;
  streetAddress?: string | null;
  workOrderNumber?: string | null;
  versions?: { workDescriptionEdited?: string | null; workDescriptionOriginal?: string | null }[];
  workType?: { exactName?: string | null } | null;
}): boolean {
  if (input.jobLocation?.trim()) return true;
  if (input.locationIdentifier?.trim()) return true;
  if (input.workOrderNumber?.trim()) return true;
  if (shortWorkName(input)) return true;
  return false;
}

export function briefListBucket(
  input: {
    status?: string | null;
    updatedAt?: Date | string | null;
    createdAt?: Date | string | null;
  } & Parameters<typeof briefHasContent>[0],
  now = Date.now(),
): "current" | "unfinished" | "archived" {
  if (input.status === "closed") return "archived";
  if (ACTIVE_JOB_STATUSES.includes(input.status as (typeof ACTIVE_JOB_STATUSES)[number])) return "current";
  if (briefHasContent(input)) return "current";
  const stamp = new Date(input.updatedAt ?? input.createdAt ?? 0).getTime();
  const hours = (now - stamp) / 3_600_000;
  if (hours <= 12) return "current";
  return "unfinished";
}

export function briefTitle(input: Parameters<typeof shortWorkName>[0] & Parameters<typeof shortPlaceName>[0] & { jrbNumber?: string }): string {
  const work = shortWorkName(input) || "Job brief";
  const place = shortPlaceName(input);
  if (place) return `${work} — ${place}`;
  return work === "Job brief" ? input.jrbNumber || "New job brief" : work;
}

export function isJobInProgress(status?: string | null): boolean {
  return status === "released_for_work";
}

export function canMarkCompleted(status?: string | null): boolean {
  return status === "released_for_work" || status === "stop_work_active" || status === "rebrief_required";
}
