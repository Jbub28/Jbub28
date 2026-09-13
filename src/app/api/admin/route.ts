import { NextRequest, NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { canPublishDirectControls, canPublishEei, canViewAudit } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { jsonError, originAllowed } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";
import { importControlledContent } from "@/lib/server/importControlled";

export async function GET() {
  const user = await requireUser();
  if (!canViewAudit(user.roles) && !canPublishEei(user.roles) && !canPublishDirectControls(user.roles)) {
    return jsonError("Not allowed.", 403);
  }
  const [exceptions, imports, sources, audit] = await Promise.all([
    prisma.controlledContentException.findMany({ orderBy: { code: "asc" } }),
    prisma.controlledContentImport.findMany({ orderBy: { importedAt: "desc" }, take: 20, include: { source: true } }),
    prisma.controlledContentSource.findMany(),
    prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: true } }),
  ]);
  return NextResponse.json({ exceptions, imports, sources, audit });
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  const user = await requireUser();
  const body = await request.json();
  if (body.action === "import") {
    if (!canPublishEei(user.roles) && !canPublishDirectControls(user.roles)) return jsonError("Not allowed.", 403);
    const report = await importControlledContent(prisma, user.id);
    await writeAudit({ userId: user.id, action: "controlled_content_import", entityType: "controlled_content_import", newValue: report as object });
    return NextResponse.json({ report });
  }
  if (body.action === "publish") {
    const status = ContentStatus.published;
    if (body.library === "eei" && canPublishEei(user.roles)) {
      await prisma.workType.updateMany({ data: { contentStatus: status } });
      await prisma.eeiActivity.updateMany({ data: { contentStatus: status } });
      await prisma.eeiTask.updateMany({ data: { contentStatus: status } });
    } else if (body.library === "direct" && canPublishDirectControls(user.roles)) {
      await prisma.highEnergyExposure.updateMany({ data: { contentStatus: status } });
      await prisma.directControl.updateMany({ where: { contentStatus: { not: ContentStatus.unresolved } }, data: { contentStatus: status } });
      await prisma.highEnergyDirectControlMapping.updateMany({ data: { contentStatus: status } });
    } else {
      return jsonError("Not allowed to publish that library.", 403);
    }
    await writeAudit({ userId: user.id, action: "controlled_content_publication", entityType: "library", newValue: body });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "approveSynonym" && canPublishEei(user.roles)) {
    await prisma.taskSynonym.update({ where: { id: body.id }, data: { status: "approved", taskId: body.taskId } });
    return NextResponse.json({ ok: true });
  }
  return jsonError("Unknown action.", 400);
}
