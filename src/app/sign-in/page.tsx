"use client";

import { useEffect, useState } from "react";
import { BigButton, Field } from "@/components/field/FieldChrome";
import { AppHeader, PageShell } from "@/components/ui/AppHeader";

export default function SignInPage() {
  const [users, setUsers] = useState<{ email: string; displayName: string; roles: string[] }[]>([]);
  const [email, setEmail] = useState("eic@energyguard.local");
  const [password, setPassword] = useState("ChangeMe!LocalOnly");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo-users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, []);

  return (
    <div className="min-h-dvh">
      <AppHeader title="EnergyGuard JRB" subtitle="Sign in to start or continue a job brief. This is a crew discussion tool, not a scorecard." />
      <PageShell>
        {error ? <p className="eg-alert mt-2 p-3" role="alert">{error}</p> : null}
        <form
          className="eg-card mt-2 space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) setError(data.error ?? "Sign in failed");
            else window.location.assign("/briefs");
          }}
        >
          <Field id="email" label="Email" value={email} onChange={setEmail} />
          <label className="block space-y-1" htmlFor="password">
            <span className="text-lg font-bold">Password</span>
            <input id="password" type="password" className="w-full rounded-xl border-2 border-[var(--border)] bg-white px-3 py-3 text-lg" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" className="w-full rounded-2xl bg-[var(--navy)] py-4 text-xl font-bold text-white">Sign in</button>
        </form>
        <h2 className="mt-8 text-xl font-bold">Local demo users</h2>
        <ul className="mt-2 space-y-2">
          {users.map((u) => (
            <li key={u.email}>
              <BigButton onClick={() => setEmail(u.email)}>
                {u.displayName} — {u.email}
              </BigButton>
            </li>
          ))}
        </ul>
      </PageShell>
    </div>
  );
}
