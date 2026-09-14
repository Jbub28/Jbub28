"use client";

import { useEffect, useState } from "react";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";
import { isSupervisorOnly } from "@/lib/auth/testSignIn";
import type { RoleName } from "@prisma/client";

type DemoUser = { email: string; displayName: string; roles: RoleName[]; crewName: string };

function optionLabel(user: DemoUser): string {
  const supervisor = user.roles.includes("supervisor");
  return supervisor
    ? `${user.displayName} — Supervisor, ${user.crewName}`
    : `${user.displayName} — ${user.crewName} field crew`;
}

export default function SignInPage() {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo-users")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.users ?? []) as DemoUser[];
        setUsers(list);
        setEmail((current) => current || list[0]?.email || "");
      });
  }, []);

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="EnergyGuard JRB"
        subtitle="Employee sign-in for Electric Delivery job briefs. This is a crew discussion tool, not a scorecard."
      />
      <PageShell>
        {error ? <p className="eg-alert mt-2 p-3" role="alert">{error}</p> : null}
        <p className="eg-muted mb-3 text-sm">Choose your name. No password is required for this TestFlight build.</p>
        <form
          className="eg-card mt-2 space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email) {
              setError("Choose who is signing in.");
              return;
            }
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Sign in failed");
              return;
            }
            const roles = (data.user?.roles ?? []) as RoleName[];
            window.location.assign(isSupervisorOnly(roles) ? "/admin/supervisor" : "/briefs");
          }}
        >
          <label className="block space-y-1" htmlFor="account">
            <span className="text-lg font-bold">Sign in as</span>
            <select
              id="account"
              className="w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 py-3 text-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            >
              <option value="">Choose who is signing in</option>
              {users.map((u) => (
                <option key={u.email} value={u.email}>
                  {optionLabel(u)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="w-full rounded-2xl bg-[var(--navy)] py-4 text-xl font-bold text-white">Sign in</button>
        </form>
      </PageShell>
      <PageFooter />
    </div>
  );
}
