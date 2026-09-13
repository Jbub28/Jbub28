"use client";

import { useEffect, useState } from "react";

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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Controlled content and audit</h1>
      {error ? <p role="alert">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="button" className="rounded-xl bg-[#1b2740] px-4 py-3 font-bold" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import" }) }).then(load)}>
          Re-run import
        </button>
        <button type="button" className="rounded-xl bg-[#1b2740] px-4 py-3 font-bold" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", library: "eei" }) }).then(load)}>
          Publish EEI
        </button>
        <button type="button" className="rounded-xl bg-[#1b2740] px-4 py-3 font-bold" onClick={() => fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", library: "direct" }) }).then(load)}>
          Publish Direct Controls
        </button>
      </div>
      <h2 className="mt-8 text-2xl font-bold">Exceptions</h2>
      <ul className="mt-2 space-y-2">
        {data?.exceptions?.map((e: any) => (
          <li key={e.code} className="rounded-xl bg-[#121a2b] p-3">
            <p className="font-bold">{e.code} · {e.status}</p>
            <p>{e.topic}</p>
            <p className="text-sm">{e.detail}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-2xl font-bold">Audit (append-only)</h2>
      <ul className="mt-2 space-y-2">
        {data?.audit?.map((a: any) => (
          <li key={a.id} className="rounded-xl bg-[#121a2b] p-3 text-sm">
            {a.createdAt} · {a.action} · {a.user?.displayName}
          </li>
        ))}
      </ul>
    </main>
  );
}
