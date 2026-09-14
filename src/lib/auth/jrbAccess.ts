import { RoleName, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { canAdminApp, canSupervisorReview, canWriteJrb } from "@/lib/auth/rbac";

type JrbIdentity = {
  organizationId: string;
  createdById: string;
  employeeInChargeId: string | null;
  supervisorId: string | null;
};

export async function crewMateUserIds(userId: string): Promise<string[]> {
  const memberships = await prisma.crewMembership.findMany({
    where: { userId },
    select: { crewId: true },
  });
  const crewIds = memberships.map((m) => m.crewId);
  if (!crewIds.length) return [userId];
  const mates = await prisma.crewMembership.findMany({
    where: { crewId: { in: crewIds } },
    select: { userId: true },
  });
  return [...new Set(mates.map((m) => m.userId))];
}

export async function defaultSupervisorIdForUser(userId: string): Promise<string | null> {
  const memberships = await prisma.crewMembership.findMany({
    where: { userId },
    include: {
      crew: {
        include: {
          members: { include: { user: { include: { roles: true } } } },
        },
      },
    },
  });
  for (const membership of memberships) {
    const supervisor = membership.crew.members.find((member) =>
      member.user.roles.some((role) => role.role === RoleName.supervisor),
    );
    if (supervisor) return supervisor.userId;
  }
  return null;
}

export async function jrbVisibleWhere(user: SessionUser): Promise<Prisma.JrbRecordWhereInput> {
  if (canAdminApp(user.roles) || user.roles.includes(RoleName.safety_reviewer)) {
    return { organizationId: user.organizationId };
  }
  if (canSupervisorReview(user.roles) && !canWriteJrb(user.roles)) {
    const mateIds = await crewMateUserIds(user.id);
    return {
      organizationId: user.organizationId,
      OR: [
        { supervisorId: user.id },
        { createdById: { in: mateIds } },
        { employeeInChargeId: { in: mateIds } },
      ],
    };
  }
  return {
    organizationId: user.organizationId,
    OR: [{ createdById: user.id }, { employeeInChargeId: user.id }],
  };
}

export async function canReadJrb(user: SessionUser, jrb: JrbIdentity): Promise<boolean> {
  if (jrb.organizationId !== user.organizationId) return false;
  if (canAdminApp(user.roles) || user.roles.includes(RoleName.safety_reviewer)) return true;
  if (jrb.createdById === user.id || jrb.employeeInChargeId === user.id) return true;
  if (!canSupervisorReview(user.roles)) return false;
  if (jrb.supervisorId === user.id) return true;
  const mateIds = await crewMateUserIds(user.id);
  return mateIds.includes(jrb.createdById) || Boolean(jrb.employeeInChargeId && mateIds.includes(jrb.employeeInChargeId));
}

export async function canMutateJrb(user: SessionUser, jrb: JrbIdentity): Promise<boolean> {
  if (!canWriteJrb(user.roles)) return false;
  if (jrb.organizationId !== user.organizationId) return false;
  if (canAdminApp(user.roles)) return true;
  return jrb.createdById === user.id || jrb.employeeInChargeId === user.id;
}

export async function canSubmitJrb(user: SessionUser, jrb: JrbIdentity): Promise<boolean> {
  if (!(await canMutateJrb(user, jrb))) return false;
  return jrb.employeeInChargeId === user.id || jrb.createdById === user.id;
}
