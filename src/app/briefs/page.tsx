"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "@/components/field/ConnectionStatus";
import { formatJobLocation } from "@/lib/domain/jobLocation";

export default function BriefsPage() {
  const [jrbs, setJrbs] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then(setMe);
    fetch("/api/jrbs").then((r) => r.json()).then((d) => setJrbs(d.jrbs ?? []));
  }, []);
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">My job briefs</h1>
        <ConnectionStatus />
      </div>
      <p className="mt-2">{me?.user?.displayName}</p>
      <Link href="/briefs/new" className="mt-4 block rounded-2xl bg-[#ffd000] py-4 text-center text-xl font-bold text-black">
        Start a Job Brief
      </Link>
      <ul className="mt-6 space-y-3">
        {jrbs.map((j) => (
          <li key={j.id}>
            <Link href={`/briefs/${j.id}`} className="block rounded-2xl bg-[#121a2b] p-4">
              <p className="text-xl font-bold">{j.jrbNumber}</p>
              <p>{j.status.replaceAll("_", " ")} · {j.workType?.exactName}</p>
              <p className="text-sm">{formatJobLocation(j)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 space-y-2">
        <Link href="/admin" className="block underline">Admin and libraries</Link>
        <button
          type="button"
          className="w-full rounded-xl bg-[#1b2740] py-3 font-bold"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/sign-in";
          }}
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
