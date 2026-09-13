import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { canSupervisorReview } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/server/http";

export async function GET() {
  const user = await requireUser();
  if (!canSupervisorReview(user.roles)) return jsonError("Not allowed.", 403);
  const jrbs = await prisma.jrbRecord.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      workType: true,
      employeeInCharge: { select: { displayName: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });
  return NextResponse.json({
    jrbs,
    reviewEnabled: false,
    notice: "Supervisor review is not active in this version.",
  });
}
