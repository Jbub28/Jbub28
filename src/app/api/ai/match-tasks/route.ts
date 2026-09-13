import { NextRequest, NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getAiProvider } from "@/lib/providers/ai";
import { applyPoleFollowUp } from "@/lib/domain/taskMatching";
import { jsonError, originAllowed, rateLimit } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";

async function approvedTasks(workTypeCode: string) {
  const rows = await prisma.eeiTask.findMany({
    where: {
      contentStatus: ContentStatus.published,
      activity: { workType: { code: workTypeCode } },
    },
    include: { activity: { include: { workType: true } }, versions: { take: 1, orderBy: { id: "desc" } } },
  });
  return rows.map((t) => ({
    id: t.id,
    exactName: t.exactName,
    activityExactName: t.activity.exactName,
    workTypeCode: t.activity.workType.code,
    workTypeExactName: t.activity.workType.exactName,
    status: t.versions[0]?.status ?? "active",
  }));
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  if (!rateLimit(`ai:${user.id}`)) return jsonError("Too many suggestion requests. Select a task from the library.", 429);
  const body = await request.json();
  const workTypeCode = String(body.workTypeCode ?? "");
  const text = String(body.text ?? "");
  const tasks = await approvedTasks(workTypeCode);
  const synonyms = await prisma.taskSynonym.findMany();
  const provider = getAiProvider();
  const result = body.followUpOption
    ? applyPoleFollowUp(String(body.followUpOption), workTypeCode, tasks)
    : await provider.matchTasks({
        workTypeCode,
        text,
        approvedTasks: tasks,
        approvedSynonyms: synonyms,
      });

  await prisma.aiRecommendation.create({
    data: {
      versionId: body.versionId,
      kind: "task_match",
      userInput: text,
      originalTranscript: body.originalTranscript,
      suggestion: result as object,
      provider: provider.name,
      model: provider.model,
      confidence: result.suggestions[0]?.confidence,
      recordsConsidered: { taskCount: tasks.length },
      userDecision: body.userDecision,
    },
  });
  await writeAudit({ userId: user.id, action: "ai_suggestion", entityType: "ai_recommendation", newValue: result as object });

  if (result.unmatched) {
    await prisma.taskMatchException.create({
      data: {
        versionId: body.versionId,
        originalTranscript: body.originalTranscript ?? text,
        editedDescription: text,
        workTypeCode,
        suggestedMatches: result.suggestions,
        matchConfidence: "More Information Needed",
        userDecision: "unmatched",
      },
    });
  }

  return NextResponse.json({
    label: "Suggested for Crew Review",
    provider: provider.name,
    result,
  });
}
