import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthProviderName } from "@/lib/providers/auth";
import { TEST_SIGN_IN_EMAILS } from "@/lib/auth/testSignIn";

export async function GET() {
  if (getAuthProviderName() !== "mock") {
    return NextResponse.json({ users: [] });
  }
  const users = await prisma.user.findMany({
    where: { active: true, email: { in: [...TEST_SIGN_IN_EMAILS] } },
    include: {
      roles: true,
      crewMemberships: { include: { crew: true } },
    },
    orderBy: { displayName: "asc" },
  });
  const order = new Map<string, number>(TEST_SIGN_IN_EMAILS.map((email, index) => [email, index]));
  users.sort((a, b) => (order.get(a.email) ?? 99) - (order.get(b.email) ?? 99));
  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      displayName: u.displayName,
      roles: u.roles.map((r) => r.role),
      crewName: u.crewMemberships[0]?.crew.name ?? "Line Crew 14",
    })),
  });
}
