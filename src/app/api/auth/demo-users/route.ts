import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthProviderName } from "@/lib/providers/auth";

export async function GET() {
  if (getAuthProviderName() !== "mock") {
    return NextResponse.json({ users: [] });
  }
  const users = await prisma.user.findMany({
    where: { active: true },
    include: { roles: true },
    orderBy: { displayName: "asc" },
  });
  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      displayName: u.displayName,
      roles: u.roles.map((r) => r.role),
    })),
  });
}
