import { RoleName } from "@prisma/client";

export const WORKER_TEST_EMAIL = "worker.test@energyguardjrb.com";
export const SUPERVISOR_TEST_EMAIL = "supervisor.test@energyguardjrb.com";

export const TEST_SIGN_IN_EMAILS = [WORKER_TEST_EMAIL, SUPERVISOR_TEST_EMAIL] as const;

export function isTestSignInEmail(email: string): boolean {
  return (TEST_SIGN_IN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}

export function isSupervisorOnly(roles: RoleName[]): boolean {
  return roles.includes(RoleName.supervisor) && !roles.includes(RoleName.field_team_member) && !roles.includes(RoleName.employee_in_charge);
}
