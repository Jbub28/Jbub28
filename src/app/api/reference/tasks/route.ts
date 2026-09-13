import { NextRequest, NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  await requireUser();
  const q = request.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
  const workTypeCode = request.nextUrl.searchParams.get("workType");
  const tasks = await prisma.eeiTask.findMany({
    where: {
      contentStatus: ContentStatus.published,
      activity: workTypeCode ? { workType: { code: workTypeCode } } : undefined,
      OR: q
        ? [
            { exactName: { contains: q, mode: "insensitive" } },
            { activity: { exactName: { contains: q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { activity: { include: { workType: true } }, versions: { take: 1, orderBy: { id: "desc" } } },
    take: 40,
    orderBy: { exactName: "asc" },
  });
  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      exactName: t.exactName,
      activity: t.activity.exactName,
      workType: t.activity.workType.exactName,
      workTypeCode: t.activity.workType.code,
      version: t.versions[0]?.version,
      sourceLocation: t.sourceLocation,
    })),
  });
}
