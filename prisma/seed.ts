import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importControlledContent } from "../src/lib/server/importControlled";

const prisma = new PrismaClient();

async function seedUsers(orgId: string) {
  const sharedHash = await bcrypt.hash("ChangeMe!LocalOnly", 10);
  const workerHash = await bcrypt.hash("EnergyGuard!Worker26", 10);
  const supervisorHash = await bcrypt.hash("EnergyGuard!Supervisor26", 10);
  const people: { email: string; displayName: string; employeeNumber: string; roles: RoleName[]; passwordHash: string }[] = [
    { email: "eic@energyguard.local", displayName: "Avery Cole", employeeNumber: "1001", roles: [RoleName.employee_in_charge, RoleName.field_team_member], passwordHash: sharedHash },
    { email: "field@energyguard.local", displayName: "Jordan Miles", employeeNumber: "1002", roles: [RoleName.field_team_member], passwordHash: sharedHash },
    { email: "supervisor@energyguard.local", displayName: "Riley Chen", employeeNumber: "1003", roles: [RoleName.supervisor], passwordHash: sharedHash },
    { email: "safety@energyguard.local", displayName: "Sam Ortiz", employeeNumber: "1004", roles: [RoleName.safety_reviewer], passwordHash: sharedHash },
    { email: "eei-admin@energyguard.local", displayName: "EEI Librarian", employeeNumber: "2001", roles: [RoleName.eei_task_library_administrator], passwordHash: sharedHash },
    { email: "dc-admin@energyguard.local", displayName: "DC Librarian", employeeNumber: "2002", roles: [RoleName.direct_control_library_administrator], passwordHash: sharedHash },
    { email: "ac-admin@energyguard.local", displayName: "AC Librarian", employeeNumber: "2003", roles: [RoleName.alternative_control_administrator], passwordHash: sharedHash },
    { email: "reg-admin@energyguard.local", displayName: "Reg Librarian", employeeNumber: "2004", roles: [RoleName.regulatory_content_administrator], passwordHash: sharedHash },
    { email: "admin@energyguard.local", displayName: "App Admin", employeeNumber: "3001", roles: [RoleName.application_administrator], passwordHash: sharedHash },
    { email: "analyst@energyguard.local", displayName: "Read Only Analyst", employeeNumber: "4001", roles: [RoleName.read_only_analyst], passwordHash: sharedHash },
    { email: "worker.test@energyguardjrb.com", displayName: "Mike Torres", employeeNumber: "1414", roles: [RoleName.field_team_member], passwordHash: workerHash },
    { email: "supervisor.test@energyguardjrb.com", displayName: "Sarah Collins", employeeNumber: "1401", roles: [RoleName.supervisor], passwordHash: supervisorHash },
  ];
  for (const p of people) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      create: { organizationId: orgId, email: p.email, displayName: p.displayName, employeeNumber: p.employeeNumber, passwordHash: p.passwordHash, active: true },
      update: { passwordHash: p.passwordHash, displayName: p.displayName, organizationId: orgId, active: true },
    });
    for (const role of p.roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role } },
        create: { userId: user.id, role },
        update: {},
      });
    }
    await prisma.userRole.deleteMany({
      where: { userId: user.id, role: { notIn: p.roles } },
    });
  }
}

async function seedLineCrew14(orgId: string) {
  const worker = await prisma.user.findUnique({ where: { email: "worker.test@energyguardjrb.com" } });
  const supervisor = await prisma.user.findUnique({ where: { email: "supervisor.test@energyguardjrb.com" } });
  if (!worker || !supervisor) return;
  const crew = await prisma.crew.upsert({
    where: { id: "00000000-0000-0000-0000-000000000014" },
    create: { id: "00000000-0000-0000-0000-000000000014", organizationId: orgId, name: "Line Crew 14" },
    update: { name: "Line Crew 14", organizationId: orgId },
  });
  for (const userId of [worker.id, supervisor.id]) {
    await prisma.crewMembership.upsert({
      where: { crewId_userId: { crewId: crew.id, userId } },
      create: { crewId: crew.id, userId },
      update: {},
    });
  }
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: { id: "00000000-0000-0000-0000-000000000001", name: "Electric Delivery" },
    update: { name: "Electric Delivery" },
  });
  await prisma.operatingArea.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    create: { id: "00000000-0000-0000-0000-000000000010", organizationId: org.id, name: "Metro East" },
    update: {},
  });
  await seedUsers(org.id);
  await seedLineCrew14(org.id);
  const admin = await prisma.user.findUnique({ where: { email: "admin@energyguard.local" } });
  const report = await importControlledContent(prisma, admin?.id);
  console.log("Import report", JSON.stringify(report, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
