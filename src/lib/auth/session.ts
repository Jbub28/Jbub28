import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { RoleName } from "@prisma/client";
import { cookieSecure } from "./cookieSecure";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  employeeNumber: string | null;
  organizationId: string;
  roles: RoleName[];
};

const cookieName = "energyguard_session";

function secret() {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SESSION_SECRET is missing or too short");
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${process.env.SESSION_IDLE_MINUTES ?? "480"}m`)
    .sign(secret());
}

export async function setSessionCookie(token: string, request?: Request) {
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      include: { roles: true },
    });
    if (!user || !user.active) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      employeeNumber: user.employeeNumber,
      organizationId: user.organizationId,
      roles: user.roles.map((r) => r.role),
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const error = new Error("Sign in required");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return user;
}
