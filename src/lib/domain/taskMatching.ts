export type MatchConfidence = "Strong Match" | "Possible Match" | "More Information Needed";

export type ApprovedTask = {
  id: string;
  exactName: string;
  activityExactName: string;
  workTypeCode: string;
  workTypeExactName: string;
  status: string;
};

export type ApprovedSynonym = {
  phrase: string;
  workTypeCode: string | null;
  proposedTaskExactName: string | null;
  status: string;
  taskId?: string | null;
};

export type TaskMatch = {
  taskId: string;
  workTypeExactName: string;
  activityExactName: string;
  exactTaskName: string;
  explanation: string;
  confidence: MatchConfidence;
};

export type MatchResult = {
  suggestions: TaskMatch[];
  followUpQuestion: string | null;
  followUpOptions: string[];
  unmatched: boolean;
  message: string | null;
};

const POLE_FOLLOW_UP = "You said you are working on a pole. What are you doing?";
const POLE_OPTIONS = [
  "Installing or removing a pole",
  "Climbing a pole",
  "Inspecting a pole",
  "Installing or removing an anchor or guy",
  "Transferring wire",
  "Something else",
];

const POLE_INSTALL_DIST = "Install or remove pole, crossarm, or brackets";
const POLE_INSTALL_TRANS = "Install or remove transmission structure (e.g. tower, pole)";
const CLIMB_POLE = "Climb pole";
const INSPECT_POLE = "Inspect pole";
const ANCHOR_GUY = "Install or remove anchor or guy";
const TRANSFER_WIRE_DIST = "Install, remove, or transfer wire";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 2);
}

function approvedSynonymsOnly(synonyms: ApprovedSynonym[]): ApprovedSynonym[] {
  return synonyms.filter((s) => s.status === "approved");
}

function scoreTask(text: string, task: ApprovedTask, synonyms: ApprovedSynonym[]): { score: number; why: string } {
  const nText = norm(text);
  const nName = norm(task.exactName);
  const nAct = norm(task.activityExactName);
  if (nText.includes(nName) || nName.includes(nText)) {
    return { score: 100, why: "The words match the exact EEI task name." };
  }
  if (nText.includes(nAct)) {
    return { score: 55, why: `The description mentions the activity “${task.activityExactName}”.` };
  }
  const syn = synonyms.find(
    (s) =>
      nText.includes(norm(s.phrase)) &&
      (s.workTypeCode === task.workTypeCode || !s.workTypeCode) &&
      (s.proposedTaskExactName === task.exactName || s.taskId === task.id),
  );
  if (syn) {
    return { score: 90, why: `It matches an approved phrase: “${syn.phrase}”.` };
  }
  const tTokens = new Set(tokens(text));
  const nameTokens = tokens(task.exactName);
  const overlap = nameTokens.filter((t) => tTokens.has(t));
  if (overlap.length >= 2) {
    return { score: 40 + overlap.length * 8, why: `Shared words: ${overlap.slice(0, 6).join(", ")}.` };
  }
  return { score: 0, why: "" };
}

function findByName(tasks: ApprovedTask[], exactName: string): ApprovedTask | undefined {
  return tasks.find((t) => t.exactName === exactName && t.status === "active");
}

export function matchTasks(input: {
  workTypeCode: string;
  text: string;
  approvedTasks: ApprovedTask[];
  approvedSynonyms: ApprovedSynonym[];
}): MatchResult {
  const text = input.text.trim();
  const empty: MatchResult = {
    suggestions: [],
    followUpQuestion: null,
    followUpOptions: [],
    unmatched: true,
    message:
      "We could not confidently match this work to the approved EEI Task Library. Add more detail or select a task.",
  };
  if (!text) return empty;

  const pool = input.approvedTasks.filter(
    (t) => t.workTypeCode === input.workTypeCode && t.status === "active",
  );
  const synonyms = approvedSynonymsOnly(input.approvedSynonyms);

  const n = norm(text);
  const mentionsPole = /\bpole\b/.test(n);
  const mentionsInstall =
    /\b(set|setting|install|installing|remove|removing|change out|frame|framing)\b/.test(n);
  const vaguePole = mentionsPole && !mentionsInstall && !/\b(climb|inspect|guy|anchor|transfer|wire)\b/.test(n);

  if (vaguePole) {
    return {
      suggestions: [],
      followUpQuestion: POLE_FOLLOW_UP,
      followUpOptions: POLE_OPTIONS,
      unmatched: false,
      message: null,
    };
  }

  const forced: ApprovedTask[] = [];
  if (mentionsPole && mentionsInstall) {
    if (input.workTypeCode === "ELECTRIC_DISTRIBUTION") {
      const t = findByName(pool, POLE_INSTALL_DIST);
      if (t) forced.push(t);
    }
    if (input.workTypeCode === "ELECTRIC_TRANSMISSION") {
      const t = findByName(pool, POLE_INSTALL_TRANS);
      if (t) forced.push(t);
    }
  }

  const scored = pool
    .map((task) => {
      const { score, why } = scoreTask(text, task, synonyms);
      return { task, score, why };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const merged = [...forced];
  for (const s of scored) {
    if (!merged.some((t) => t.id === s.task.id)) merged.push(s.task);
  }

  const top = merged.slice(0, 3).map((task) => {
    const scoredHit = scored.find((s) => s.task.id === task.id);
    const confidence: MatchConfidence =
      scoredHit && scoredHit.score >= 85
        ? "Strong Match"
        : scoredHit && scoredHit.score >= 50
          ? "Possible Match"
          : forced.some((f) => f.id === task.id)
            ? "Strong Match"
            : "More Information Needed";
    return {
      taskId: task.id,
      workTypeExactName: task.workTypeExactName,
      activityExactName: task.activityExactName,
      exactTaskName: task.exactName,
      explanation:
        forced.some((f) => f.id === task.id)
          ? `For ${task.workTypeExactName}, this is the approved pole/structure task.`
          : scoredHit?.why || "Suggested from the approved library for this work type.",
      confidence,
    };
  });

  if (top.length === 0) return empty;
  return { suggestions: top, followUpQuestion: null, followUpOptions: [], unmatched: false, message: null };
}

export function applyPoleFollowUp(
  option: string,
  workTypeCode: string,
  approvedTasks: ApprovedTask[],
): MatchResult {
  const pool = approvedTasks.filter((t) => t.workTypeCode === workTypeCode && t.status === "active");
  const pick = (name: string) => findByName(pool, name);
  let task: ApprovedTask | undefined;
  if (option === "Installing or removing a pole") {
    task =
      workTypeCode === "ELECTRIC_TRANSMISSION" ? pick(POLE_INSTALL_TRANS) : pick(POLE_INSTALL_DIST);
  } else if (option === "Climbing a pole") task = pick(CLIMB_POLE) ?? pick("Climb structure");
  else if (option === "Inspecting a pole") task = pick(INSPECT_POLE) ?? pick("Inspect and maintain structure and foundation");
  else if (option === "Installing or removing an anchor or guy")
    task = pick(ANCHOR_GUY) ?? pick("Install or remove down guys");
  else if (option === "Transferring wire")
    task =
      workTypeCode === "ELECTRIC_TRANSMISSION"
        ? pick("Install, sag, dead end, transfer, or remove wire")
        : pick(TRANSFER_WIRE_DIST);
  if (!task) {
    return {
      suggestions: [],
      followUpQuestion: null,
      followUpOptions: [],
      unmatched: true,
      message:
        "We could not confidently match this work to the approved EEI Task Library. Add more detail or select a task.",
    };
  }
  return {
    suggestions: [
      {
        taskId: task.id,
        workTypeExactName: task.workTypeExactName,
        activityExactName: task.activityExactName,
        exactTaskName: task.exactName,
        explanation: "You answered the follow-up question. Confirm the exact EEI task.",
        confidence: "Strong Match",
      },
    ],
    followUpQuestion: null,
    followUpOptions: [],
    unmatched: false,
    message: null,
  };
}
