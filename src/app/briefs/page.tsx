"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConnectionStatus } from "@/components/field/ConnectionStatus";
import { AppHeader, PageFooter, PageShell, StatusChip, canSeeLibraries, canSeeSupervisorLog } from "@/components/ui/AppHeader";
import { briefListBucket, briefTitle, plainStatus, statusTone } from "@/lib/domain/briefPresentation";

type ListFilter = "current" | "archived";

export default function BriefsPage() {
  const [jrbs, setJrbs] = useState<any[] | null>(null);
  const [me, setMe] = useState<any>(null);
  const [filter, setFilter] = useState<ListFilter>("current");
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then(setMe);
    fetch("/api/jrbs").then((r) => r.json()).then((d) => setJrbs(d.jrbs ?? []));
  }, []);
  const roles = me?.user?.roles as string[] | undefined;
  const grouped = useMemo(() => {
    const list = jrbs ?? [];
    const current: any[] = [];
    const archived: any[] = [];
    for (const j of list) {
      const bucket = briefListBucket(j);
      if (bucket === "archived" || bucket === "unfinished") archived.push(j);
      else current.push(j);
    }
    return { current, archived };
  }, [jrbs]);
  const shown = filter === "current" ? grouped.current : grouped.archived;
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
        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Job brief lists">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "current"}
            className={`rounded-xl py-3 font-bold ${filter === "current" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
            onClick={() => setFilter("current")}
          >
            Current jobs ({grouped.current.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "archived"}
            className={`rounded-xl py-3 font-bold ${filter === "archived" ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
            onClick={() => setFilter("archived")}
          >
            Archived ({grouped.archived.length})
          </button>
        </div>
        <p className="eg-muted mt-3 text-sm">
          {filter === "current"
            ? "Jobs you are still working on. Empty old starts are in Archived."
            : "Completed jobs and unfinished starts that were never filled in."}
        </p>
        {shown.length === 0 ? (
          <p className="eg-card mt-6 p-4 eg-muted">
            {filter === "current" ? "No current jobs. Start a brief or check Archived." : "Nothing archived yet."}
          </p>
        ) : null}
        <ul className="mt-6 space-y-3">
          {shown.map((j) => {
            const title = briefTitle(j);
            const date = new Date(j.date ?? j.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
            return (
              <li key={j.id}>
                <Link href={`/briefs/${j.id}`} className="eg-card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xl font-bold">{title}</p>
                    <StatusChip tone={statusTone(j.status)}>{plainStatus(j.status)}</StatusChip>
                  </div>
                  <p className="mt-1 text-sm">{j.jrbNumber} · {date}</p>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 space-y-2">
          {canSeeLibraries(roles) ? (
            <Link href="/admin" className="block font-bold text-[var(--navy)] underline">Libraries and audit</Link>
          ) : null}
          {canSeeSupervisorLog(roles) ? (
            <Link href="/admin/supervisor" className="block font-bold text-[var(--navy)] underline">Supervisor</Link>
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
      <PageFooter />
    </div>
  );
}
