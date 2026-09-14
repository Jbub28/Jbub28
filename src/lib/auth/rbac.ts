import { RoleName } from "@prisma/client";

export const FIELD_ROLES: RoleName[] = [
  RoleName.field_team_member,
  RoleName.employee_in_charge,
];

export function hasRole(roles: RoleName[], role: RoleName): boolean {
  return roles.includes(role) || roles.includes(RoleName.application_administrator);
}

export function canWriteJrb(roles: RoleName[]): boolean {
  return (
    FIELD_ROLES.some((r) => roles.includes(r)) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canReleaseJrb(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.employee_in_charge) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canInitiateStopWork(roles: RoleName[]): boolean {
  return canWriteJrb(roles);
}

export function canSupervisorReview(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.supervisor) ||
    roles.includes(RoleName.safety_reviewer) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canPublishEei(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.eei_task_library_administrator) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canPublishDirectControls(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.direct_control_library_administrator) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canPublishAlternativeControls(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.alternative_control_administrator) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canPublishRegulatory(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.regulatory_content_administrator) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canViewAudit(roles: RoleName[]): boolean {
  return (
    roles.includes(RoleName.safety_reviewer) ||
    roles.includes(RoleName.application_administrator)
  );
}

export function canAdminApp(roles: RoleName[]): boolean {
  return roles.includes(RoleName.application_administrator);
}

export function canReadOnlyReport(roles: RoleName[]): boolean {
  return roles.includes(RoleName.read_only_analyst) || canViewAudit(roles) || canAdminApp(roles);
}

export function assertRole(roles: RoleName[], allowed: (roles: RoleName[]) => boolean, message = "Not allowed"): void {
  if (!allowed(roles)) {
    const error = new Error(message);
    (error as Error & { status: number }).status = 403;
    throw error;
  }
}
