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
}): boolean {
  if (input.jobLocation?.trim()) return true;
  if (input.locationIdentifier?.trim()) return true;
  if (input.workOrderNumber?.trim()) return true;
  const version = input.versions?.[0];
  if (version?.workDescriptionEdited?.trim() || version?.workDescriptionOriginal?.trim()) return true;
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

export function formatClockTime(value: Date | string | null | undefined, now = new Date()): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 60_000) return "just opened";
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  const remainMinutes = minutes % 60;
  if (days > 0) {
    if (remainHours === 0) return days === 1 ? "1 day" : `${days} days`;
    return `${days === 1 ? "1 day" : `${days} days`} ${remainHours} hr`;
  }
  if (hours > 0) {
    if (remainMinutes === 0) return hours === 1 ? "1 hr" : `${hours} hr`;
    return `${hours} hr ${remainMinutes} min`;
  }
  return `${minutes} min`;
}

export function jobOpenedAt(input: {
  createdAt?: Date | string | null;
  date?: Date | string | null;
}): Date | null {
  const raw = input.createdAt ?? input.date;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function jobEndedAt(input: {
  status?: string | null;
  updatedAt?: Date | string | null;
}): Date | null {
  if (input.status !== "closed") return null;
  if (!input.updatedAt) return null;
  const date = input.updatedAt instanceof Date ? input.updatedAt : new Date(input.updatedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function jobTiming(
  input: {
    createdAt?: Date | string | null;
    date?: Date | string | null;
    updatedAt?: Date | string | null;
    status?: string | null;
    versions?: { releasedAt?: Date | string | null }[];
  },
  now = new Date(),
): {
  openedAt: Date | null;
  openedLabel: string;
  durationLabel: string;
  line: string;
} {
  const openedAt = jobOpenedAt(input);
  if (!openedAt) {
    return { openedAt: null, openedLabel: "", durationLabel: "", line: "" };
  }
  const endedAt = jobEndedAt(input);
  const end = endedAt ?? now;
  const durationLabel = formatDuration(end.getTime() - openedAt.getTime());
  const openedLabel = formatClockTime(openedAt, now);
  const durationPhrase = endedAt ? `Lasted ${durationLabel}` : durationLabel;
  return {
    openedAt,
    openedLabel,
    durationLabel,
    line: `Opened ${openedLabel} · ${durationPhrase}`,
  };
}


export function isJobInProgress(status?: string | null): boolean {
  return status === "released_for_work";
}

export function canMarkCompleted(status?: string | null): boolean {
  return status === "released_for_work" || status === "stop_work_active" || status === "rebrief_required";
}
