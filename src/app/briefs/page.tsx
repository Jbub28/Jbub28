"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "@/components/field/ConnectionStatus";
import { formatJobLocation } from "@/lib/domain/jobLocation";
import { AppHeader, PageShell, StatusChip, canSeeLibraries, canSeeSupervisorLog } from "@/components/ui/AppHeader";

function statusTone(status: string): "ok" | "warn" | "neutral" {
  if (status === "released_for_work" || status === "closed") return "ok";
  if (status.includes("stop") || status.includes("rebrief")) return "warn";
  return "neutral";
}

export default function BriefsPage() {
  const [jrbs, setJrbs] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then(setMe);
    fetch("/api/jrbs").then((r) => r.json()).then((d) => setJrbs(d.jrbs ?? []));
  }, []);
  const roles = me?.user?.roles as string[] | undefined;
  return (
    <div className="min-h-dvh">
      <AppHeader
        title="My job briefs"
        subtitle={me?.user?.displayName ? `${me.user.displayName} · Electric Delivery` : "Electric Delivery"}
        right={<ConnectionStatus />}
      />
      <PageShell>
        <Link href="/briefs/new" className="block rounded-2xl bg-[var(--navy)] py-4 text-center text-xl font-bold text-white">
          Start a Job Brief
        </Link>
        <ul className="mt-6 space-y-3">
          {jrbs.map((j) => (
            <li key={j.id}>
              <Link href={`/briefs/${j.id}`} className="eg-card block p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xl font-bold">{j.jrbNumber}</p>
                  <StatusChip tone={statusTone(j.status)}>{j.status.replaceAll("_", " ")}</StatusChip>
                </div>
                <p className="mt-1">{j.workType?.exactName}</p>
                <p className="eg-muted text-sm">{formatJobLocation(j) || "Location not entered yet"}</p>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 space-y-2">
          {canSeeLibraries(roles) ? (
            <Link href="/admin" className="block font-bold text-[var(--navy)] underline">Libraries and audit</Link>
          ) : null}
          {canSeeSupervisorLog(roles) ? (
            <Link href="/admin/supervisor-log" className="block font-bold text-[var(--navy)] underline">Supervisor log</Link>
          ) : null}
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--border)] bg-white py-3 font-bold"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/sign-in";
            }}
          >
            Sign out
          </button>
        </div>
      </PageShell>
    </div>
  );
}
