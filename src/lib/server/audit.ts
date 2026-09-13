import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  originalValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}) {
  await prisma.auditEvent.create({
    data: {
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      originalValue: input.originalValue,
      newValue: input.newValue,
    },
  });
}

export async function nextJrbNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JRB-${year}-`;
  const latest = await prisma.jrbRecord.findFirst({
    where: { jrbNumber: { startsWith: prefix } },
    orderBy: { jrbNumber: "desc" },
    select: { jrbNumber: true },
  });
  const next = latest ? Number(latest.jrbNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}
