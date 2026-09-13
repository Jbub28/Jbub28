import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importControlledContent } from "../src/lib/server/importControlled";

const prisma = new PrismaClient();

async function seedUsers(orgId: string) {
  const passwordHash = await bcrypt.hash("ChangeMe!LocalOnly", 10);
  const people: { email: string; displayName: string; employeeNumber: string; roles: RoleName[] }[] = [
    { email: "eic@energyguard.local", displayName: "Avery Cole", employeeNumber: "1001", roles: [RoleName.employee_in_charge, RoleName.field_team_member] },
    { email: "field@energyguard.local", displayName: "Jordan Miles", employeeNumber: "1002", roles: [RoleName.field_team_member] },
    { email: "supervisor@energyguard.local", displayName: "Riley Chen", employeeNumber: "1003", roles: [RoleName.supervisor] },
    { email: "safety@energyguard.local", displayName: "Sam Ortiz", employeeNumber: "1004", roles: [RoleName.safety_reviewer] },
    { email: "eei-admin@energyguard.local", displayName: "EEI Librarian", employeeNumber: "2001", roles: [RoleName.eei_task_library_administrator] },
    { email: "dc-admin@energyguard.local", displayName: "DC Librarian", employeeNumber: "2002", roles: [RoleName.direct_control_library_administrator] },
    { email: "ac-admin@energyguard.local", displayName: "AC Librarian", employeeNumber: "2003", roles: [RoleName.alternative_control_administrator] },
    { email: "reg-admin@energyguard.local", displayName: "Reg Librarian", employeeNumber: "2004", roles: [RoleName.regulatory_content_administrator] },
    { email: "admin@energyguard.local", displayName: "App Admin", employeeNumber: "3001", roles: [RoleName.application_administrator] },
    { email: "analyst@energyguard.local", displayName: "Read Only Analyst", employeeNumber: "4001", roles: [RoleName.read_only_analyst] },
  ];
  for (const p of people) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      create: { organizationId: orgId, email: p.email, displayName: p.displayName, employeeNumber: p.employeeNumber, passwordHash },
      update: { passwordHash, displayName: p.displayName },
    });
    for (const role of p.roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role } },
        create: { userId: user.id, role },
        update: {},
      });
    }
  }
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: { id: "00000000-0000-0000-0000-000000000001", name: "Electric Delivery Demo" },
    update: {},
  });
  await prisma.operatingArea.upsert({
    where: { id: "00000000-0000-0000-0000-000000000010" },
    create: { id: "00000000-0000-0000-0000-000000000010", organizationId: org.id, name: "Metro East" },
    update: {},
  });
  await seedUsers(org.id);
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
