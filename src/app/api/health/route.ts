import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "EnergyGuard JRB" });
  } catch {
    return NextResponse.json({ ok: false, service: "EnergyGuard JRB" }, { status: 503 });
  }
}
