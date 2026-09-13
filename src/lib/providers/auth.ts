import type { SessionUser } from "@/lib/auth/session";

export interface AuthProvider {
  name: string;
  listDemoUsers?(): Promise<{ email: string; displayName: string; roles: string[] }[]>;
  authenticate(input: { email?: string; password?: string; entraCode?: string }): Promise<SessionUser>;
}

export class EntraAuthProvider implements AuthProvider {
  name = "entra";
  async authenticate(): Promise<SessionUser> {
    throw Object.assign(new Error("Microsoft Entra ID is not configured in this environment."), { status: 501 });
  }
}

export function getAuthProviderName(): string {
  return process.env.AUTH_PROVIDER ?? "mock";
}
