"use client";

import { useEffect, useState } from "react";
import { BigButton, Field } from "@/components/field/FieldChrome";

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
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">EnergyGuard JRB</h1>
      <p className="mt-2 text-lg">Sign in to start or continue a job brief. This is a crew discussion tool, not a scorecard.</p>
      {error ? <p className="mt-4 rounded-xl border-2 border-yellow-300 p-3" role="alert">{error}</p> : null}
      <form
        className="mt-6 space-y-4"
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
        <Field id="email" label="Email" value={email} onChange={setEmail} voice={false} />
        <label className="block space-y-1" htmlFor="password">
          <span className="text-lg font-bold">Password</span>
          <input id="password" type="password" className="w-full rounded-xl border-2 border-slate-500 bg-[#121a2b] px-3 py-3 text-lg" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" className="w-full rounded-2xl bg-[#ffd000] py-4 text-xl font-bold text-black">Sign in</button>
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
    </main>
  );
}
