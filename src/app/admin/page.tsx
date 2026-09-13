"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader, PageShell } from "@/components/ui/AppHeader";

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    fetch("/api/admin")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="min-h-dvh">
      <AppHeader title="Libraries and audit" subtitle="Controlled content administration." />
      <PageShell wide>
        {error ? <p className="eg-alert p-3" role="alert">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-xl bg-[var(--navy)] px-4 py-3 font-bold text-white" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import" }) }).then(load)}>
            Re-run import
          </button>
          <button type="button" className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 font-bold" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", library: "eei" }) }).then(load)}>
            Publish EEI
          </button>
          <button type="button" className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 font-bold" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", library: "direct" }) }).then(load)}>
            Publish Direct Controls
          </button>
        </div>
        <p className="mt-4">
          <Link href="/briefs" className="font-bold text-[var(--navy)] underline">My briefs</Link>
        </p>
        <h2 className="mt-8 text-2xl font-bold">Exceptions</h2>
        <ul className="mt-2 space-y-2">
          {data?.exceptions?.map((e: any) => (
            <li key={e.code} className="eg-card p-3">
              <p className="font-bold">{e.code} · {e.status}</p>
              <p>{e.topic}</p>
              <p className="eg-muted text-sm">{e.detail}</p>
            </li>
          ))}
        </ul>
        <h2 className="mt-8 text-2xl font-bold">Audit (append-only)</h2>
        <ul className="mt-2 space-y-2">
          {data?.audit?.map((a: any) => (
            <li key={a.id} className="eg-card p-3 text-sm">
              {a.createdAt} · {a.action} · {a.user?.displayName}
            </li>
          ))}
        </ul>
      </PageShell>
    </div>
  );
}
