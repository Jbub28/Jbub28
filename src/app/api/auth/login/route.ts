import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getAuthProviderName } from "@/lib/providers/auth";
import { jsonError, originAllowed } from "@/lib/server/http";
import { writeAudit } from "@/lib/server/audit";
import { isTestSignInEmail } from "@/lib/auth/testSignIn";

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) return jsonError("Invalid origin", 403);
  if (getAuthProviderName() === "entra") {
    return jsonError("Use Microsoft Entra ID sign-in.", 501);
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const user = await prisma.user.findUnique({ where: { email }, include: { roles: true } });
  if (!user || !user.active) {
    return jsonError("Email or password is not correct.", 401);
  }
  const mockPicker = getAuthProviderName() === "mock" && isTestSignInEmail(email) && !password;
  const passwordOk = Boolean(user.passwordHash) && password.length > 0 && (await bcrypt.compare(password, user.passwordHash ?? ""));
  if (!mockPicker && !passwordOk) {
    return jsonError("Email or password is not correct.", 401);
  }
  const session = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    employeeNumber: user.employeeNumber,
    organizationId: user.organizationId,
    roles: user.roles.map((r) => r.role),
  };
  const token = await createSessionToken(session);
  await setSessionCookie(token, request);
  await writeAudit({ userId: user.id, action: "sign_in", entityType: "user", entityId: user.id });
  return NextResponse.json({ user: session });
}
