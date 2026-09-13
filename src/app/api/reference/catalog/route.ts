import { NextRequest, NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  await requireUser();
  const exposureId = request.nextUrl.searchParams.get("exposureId");
  const exposures = await prisma.highEnergyExposure.findMany({
    where: { contentStatus: { in: [ContentStatus.published, ContentStatus.staged] } },
    include: { icon: true, mappings: { include: { directControl: true } } },
    orderBy: { key: "asc" },
  });
  const categories = await prisma.alternativeControlCategory.findMany({
    include: { controls: true },
  });
  const ppe = await prisma.ppeItem.findMany();
  const help = await prisma.helpContent.findMany();
  const questions = await prisma.conditionalQuestion.findMany();
  const workTypes = await prisma.workType.findMany({ where: { operational: true } });
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, displayName: true, email: true } });
  const areas = await prisma.operatingArea.findMany();
  const filteredControls = exposureId
    ? await prisma.highEnergyDirectControlMapping.findMany({
        where: { exposureId, contentStatus: ContentStatus.published },
        include: { directControl: true },
      })
    : [];
  return NextResponse.json({
    exposures,
    categories,
    ppe,
    help,
    questions,
    workTypes,
    users,
    areas,
    mappedDirectControls: filteredControls.map((m) => m.directControl),
  });
}
