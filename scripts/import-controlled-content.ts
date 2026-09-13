import { PrismaClient } from "@prisma/client";
import { importControlledContent } from "../src/lib/server/importControlled";

const prisma = new PrismaClient();

async function main() {
  const report = await importControlledContent(prisma);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
